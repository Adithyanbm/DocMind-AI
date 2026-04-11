import docker
import os
import socket
import re
from pathlib import Path

class DockerPreviewManager:
    def __init__(self):
        self.client = None
        self._ensure_client()
            
        self.base_dir = Path(__file__).parent / "previews"
        self.base_dir.mkdir(exist_ok=True)
        self.image_name = "docmind-react-preview"
        
        # Activity tracking for auto-cleanup (15 min)
        self.last_activity = {} # container_name -> timestamp
        self._start_cleanup_daemon()

    def _ensure_client(self):
        """Attempts to initialize the Docker client if not already connected."""
        if self.client:
            try:
                self.client.ping()
                return True
            except Exception:
                self.client = None

        try:
            # Default connection (DOCKER_HOST env var)
            self.client = docker.from_env()
            self.client.ping()
            return True
        except Exception:
            try:
                # Common Windows named pipe fallback
                self.client = docker.DockerClient(base_url='npipe:////./pipe/docker_engine')
                self.client.ping()
                return True
            except Exception as e:
                print(f"DEBUG: Docker re-initialization failed: {e}")
                self.client = None
                return False
        
    def _start_cleanup_daemon(self):
        import threading
        import time
        
        def cleanup_task():
            while True:
                try:
                    now = time.time()
                    to_remove = []
                    for name, last_time in list(self.last_activity.items()):
                        # 15 minutes of inactivity (900 seconds)
                        if now - last_time > 900:
                            to_remove.append(name)
                    
                    for name in to_remove:
                        try:
                            if not self._ensure_client():
                                continue

                            print(f"DEBUG: Auto-cleaning idle container {name}")
                            container = self.client.containers.get(name)
                            container.stop(timeout=1)
                            container.remove()
                            del self.last_activity[name]
                        except Exception:
                            # Might already be gone
                            if name in self.last_activity:
                                del self.last_activity[name]
                except Exception as e:
                    print(f"DEBUG: Cleanup daemon error: {e}")
                
                time.sleep(60) # Check every minute
                
        daemon = threading.Thread(target=cleanup_task, daemon=True)
        daemon.start()

    def _get_free_port(self):
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.bind(('127.0.0.1', 0))
        port = s.getsockname()[1]
        s.close()
        return port

    def start_preview(self, identifier, code):
        if not self._ensure_client():
            raise Exception("Docker client not initialized. Is Docker running?")

        # Clean identifier (slugify)
        safe_id = "".join([c if c.isalnum() else "-" for c in identifier]).lower()
        preview_path = self.base_dir / safe_id
        preview_path.mkdir(parents=True, exist_ok=True)
        
        # Write App.jsx (with basic formatting to help Vite/Debugger)
        # Add newlines after imports, before const/export, etc.
        formatted_code = re.sub(r'([;}])\s*(import|const|export|let|var|function|class)', r'\1\n\2', code)
        # Ensure separate lines for multiple imports
        formatted_code = re.sub(r'(import\s+[^;]+;)\s*(import)', r'\1\n\2', formatted_code)
        
        app_path = preview_path / "App.jsx"
        with open(app_path, "w", encoding='utf-8') as f:
            f.write(formatted_code)
            
        container_name = f"docmind-preview-{safe_id}"
        import time
        self.last_activity[container_name] = time.time()
        
        # Detect required modules from code
        required_modules = self._get_required_modules(code)
        
        try:
            container = self.client.containers.get(container_name)
            if container.status != "running":
                container.start()
        except docker.errors.NotFound:
            pass

        # Start or Recreate container
        port = self._get_free_port()
        print(f"DEBUG: Starting container {container_name} on host port {port}")
        
        try:
            try:
                old = self.client.containers.get(container_name)
                old.stop(timeout=1)
                old.remove()
            except: pass

            config_path = Path(__file__).parent / "docker_base" / "vite.config.js"

            setup_cmd = '/bin/sh -c "npm install @ant-design/icons dayjs classnames --legacy-peer-deps && rm -rf node_modules/.vite && npm run dev -- --force"'

            container = self.client.containers.run(
                self.image_name,
                command=setup_cmd,
                detach=True,
                name=container_name,
                ports={'5173/tcp': port},
                volumes={
                    str(preview_path.absolute()): {'bind': '/app/src/content', 'mode': 'rw'},
                    str(config_path.absolute()): {'bind': '/app/vite.config.js', 'mode': 'ro'}
                },
                labels={"docmind-preview": "true"},
                environment={
                    "CHOKIDAR_USEPOLLING": "true",
                    "VITE_CLIENT_PORT": str(port)
                }
            )
            
            # 1. Proactively install detected modules
            if required_modules:
                self._install_modules(container, required_modules)
            
            # 2. Poll until Vite is ready AND warmed up (max 20 seconds)
            import requests
            preview_url = f"http://127.0.0.1:{port}"
            module_url = f"{preview_url}/src/content/App.jsx"
            
            for i in range(120): # 60 seconds max to allow for synchronized setup
                try:
                    # Check root first
                    resp = requests.get(preview_url, timeout=1)
                    if resp.status_code == 200:
                        # Warm up the module transformation
                        try:
                            requests.get(module_url, timeout=1)
                        except: pass
                        
                        # Final check for any late-breaking resolution errors
                        self._check_and_fix_missing_modules(container)
                        
                        print(f"DEBUG: Container {container_name} ready at {preview_url}")
                        return preview_url
                except Exception:
                    self._check_and_fix_missing_modules(container)
                time.sleep(0.5)
            
            return preview_url
        except Exception as e:
            print(f"ERROR: Failed to start container {container_name}: {e}")
            raise Exception(f"Failed to start container: {str(e)}")

    def _get_required_modules(self, code):
        """Extracts npm module names from import statements."""
        # Find: import ... from 'module' or import 'module'
        pattern = r"from\s+['\"]([^./][^'\"]+)['\"]|import\s+['\"]([^./][^'\"]+)['\"]"
        matches = re.findall(pattern, code)
        modules = []
        
        # Load base package.json to avoid redundant installs
        base_pkg = {}
        try:
            # Look in docker_base, not previews
            base_pkg_path = Path(__file__).parent / "docker_base" / "package.json"
            with open(base_pkg_path, "r") as f:
                import json
                base_pkg = json.load(f).get("dependencies", {})
        except: pass

        for m in matches:
            module = m[0] or m[1]
            if module and not module.startswith('.') and not module.startswith('/'):
                parts = module.split('/')
                if module.startswith('@') and len(parts) >= 2:
                    base = f"{parts[0]}/{parts[1]}"
                else:
                    base = parts[0]
                
                # Skip modules already in base
                if base not in modules and base not in base_pkg and base != 'react' and base != 'react-dom':
                    modules.append(base)
        return modules

    def _install_modules(self, container, modules):
        """Runs npm install for a list of modules and waits for completion."""
        # AI-Safe Versions mapping
        STABLE_VERSIONS = {
            "@chakra-ui/react": "@chakra-ui/react@2",
            "@chakra-ui/icons": "@chakra-ui/icons@2",
            "@fluentui/react": "@fluentui/react@8",
            "framer-motion": "framer-motion@11"
        }
        
        for module in modules:
            pkg_to_install = STABLE_VERSIONS.get(module, module)
            print(f"DEBUG: Installing required module '{pkg_to_install}' in {container.name}...")
            # Run synchronously (blocking) to ensure it exists before we return the URL
            exit_code, output = container.exec_run(f"npm install {pkg_to_install} --legacy-peer-deps")
            if exit_code != 0:
                print(f"ERROR installing {module}: {output.decode()}")

    def _check_and_fix_missing_modules(self, container):
        """Parses logs and attempts to install missing npm modules."""
        import docker
        try:
            # Check if container still exists and is running
            try:
                container.reload()
                if container.status != 'running':
                    return
            except (docker.errors.NotFound, docker.errors.APIError):
                return

            logs = container.logs().decode('utf-8')
            # Look for Vite resolution errors
            # Pattern: Failed to resolve import "module-name" from "src/content/App.jsx"
            matches = re.findall(r'Failed to resolve import "([^"]+)"', logs)
            if matches:
                # Get unique modules
                missing = list(set(matches))
                for module in missing:
                    # Skip relative imports
                    if module.startswith('.') or module.startswith('/'):
                        continue
                        
                    parts = module.split('/')
                    if module.startswith('@') and len(parts) >= 2:
                        base = f"{parts[0]}/{parts[1]}"
                    else:
                        base = parts[0]
                        
                    print(f"DEBUG: Detected missing module '{base}' (from '{module}') in container {container.name}. Installing...")
                    # AI-Safe Versions mapping
                    STABLE_VERSIONS = {
                        "@chakra-ui/react": "@chakra-ui/react@2",
                        "@chakra-ui/icons": "@chakra-ui/icons@2",
                        "@fluentui/react": "@fluentui/react@8",
                        "framer-motion": "framer-motion@11"
                    }
                    pkg_to_install = STABLE_VERSIONS.get(base, base)
                    
                    # Run npm install inside container
                    try:
                        res = container.exec_run(f"npm install {pkg_to_install} --legacy-peer-deps")
                        if res.exit_code == 0:
                            print(f"DEBUG: Successfully installed {pkg_to_install} in {container.name}")
                        else:
                            print(f"ERROR: Failed to install {pkg_to_install} in {container.name}: {res.output.decode()}")
                    except (docker.errors.NotFound, docker.errors.APIError):
                        print(f"DEBUG: Container {container.name} went away during install.")
                        return
        except Exception as e:
            print(f"DEBUG: Error in module fixer: {e}")

    def _get_container_url(self, container):
        try:
            container.reload()
            port = container.attrs['NetworkSettings']['Ports']['5173/tcp'][0]['HostPort']
            return f"http://127.0.0.1:{port}"
        except (docker.errors.NotFound, docker.errors.APIError, KeyError, IndexError):
            return None

    def stop_preview(self, identifier):
        if not self._ensure_client(): return False
        safe_id = "".join([c if c.isalnum() else "-" for c in identifier]).lower()
        container_name = f"docmind-preview-{safe_id}"
        try:
            container = self.client.containers.get(container_name)
            container.stop()
            container.remove()
            return True
        except:
            return False

    def cleanup_all(self):
        """Stops and removes all docmind-preview containers."""
        if not self._ensure_client(): return
        containers = self.client.containers.list(all=True, filters={"label": "docmind-preview=true"})
        for c in containers:
            try:
                c.stop()
                c.remove()
            except:
                pass

# Singleton instance
preview_manager = DockerPreviewManager()
