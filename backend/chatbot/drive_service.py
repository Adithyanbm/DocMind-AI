from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload
import io
import datetime
import json
import base64
from google.auth import exceptions
from google.auth.transport.requests import Request as AuthRequest

from django.utils import timezone
from authentication.google_auth import refresh_google_token

def get_drive_service(access_token):
    """
    Helper function to build the Google Drive API client.
    """
    credentials = Credentials(token=access_token)
    return build('drive', 'v3', credentials=credentials)

def handle_refresh_and_retry(user, func, *args, **kwargs):
    """
    Helper to handle Google token refresh and retry a function.
    """
    try:
        return func(*args, **kwargs)
    except exceptions.RefreshError:
        print(f"DEBUG: Google token expired for user {user.email}, attempting refresh...")
        new_token = refresh_google_token(user.profile)
        if new_token:
            print(f"DEBUG: Refresh successful for {user.email}")
            # The function usually takes access_token as the first arg
            # Replace the old token with the new one
            new_args = list(args)
            if len(new_args) > 0:
                new_args[0] = new_token
            return func(*new_args, **kwargs), new_token
        else:
            print(f"DEBUG: Refresh FAILED for {user.email}")
            raise

def upload_chat_to_drive(user, access_token, messages, file_id=None, token_usage=None):
    """
    Uploads the chat history to the user's Google Drive as a Markdown file.
    Includes persistent metadata for PDF attachments, images, and token usage.
    """
    def _upload(current_token):
        try:
            service = get_drive_service(current_token)
        
            # Determine a title from the first user message
            title_summary = "New Chat"
            for msg in messages:
                if msg.get("role") == "user":
                    content = msg.get("content", "")
                    if isinstance(content, list):
                        text_parts = [p.get("text", "") for p in content if p.get("type") == "text"]
                        user_text = " ".join(text_parts)[:30].strip()
                        original_len = len(" ".join(text_parts))
                    else:
                        user_text = str(content)[:30].strip()
                        original_len = len(str(content))
                        
                    # Clean filename characters
                    title_summary = "".join([c if c.isalnum() or c in [' ', '-', '_'] else "" for c in user_text])
                    if original_len > 30:
                        title_summary += "..."
                    break
            
            if not title_summary:
                title_summary = "Chat"
            
            # Format token usage metadata if provided
            token_meta = ""
            if token_usage:
                token_meta = f"<!-- TOKEN_USAGE: {json.dumps(token_usage)} -->\n"

            # Format the messages into a Markdown string
            formatted_content = f"# DocMind AI Chat Session\n*Saved on: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}*\n{token_meta}\n---\n\n"
            
            for msg in messages:
                # Use 'You' and 'DocMind AI' as role markers for consistency with the frontend parser
                role_marker = "You" if msg.get("role") == "user" else "DocMind AI"
                content = msg.get("content", "")
                reasoning = msg.get("reasoning_content")
                
                parts_text = []
                
                # Prepend reasoning content if available (hidden or visible)
                if role_marker == "DocMind AI" and reasoning:
                    parts_text.append(f"<reasoning>\n{reasoning}\n</reasoning>")
                
                # Handle complex content (e.g., from Vision/File AI)
                if isinstance(content, list):
                    for part in content:
                        ptype = part.get("type")
                        if ptype == "text":
                            parts_text.append(part.get("text", ""))
                        elif ptype == "image_url":
                            img_url = part.get("image_url", {}).get("url", "")
                            if img_url:
                                parts_text.append(f"![Attached Image]({img_url})")
                        elif ptype == "file":
                            file_name = part.get("file_url", {}).get("name", "document.pdf")
                            
                            # Extract metadata from the message object (passed from Dashboard.jsx)
                            thumbnail = msg.get("attachmentData") if msg.get("attachmentType") == "application/pdf" else None
                            pages = msg.get("attachmentNumPages", 0)
                            base64_data = msg.get("attachmentBase64")
                            
                            meta = json.dumps({
                                "name": file_name,
                                "pages": pages,
                                "base64": base64_data,
                                "type": "application/pdf"
                            })
                            
                            if thumbnail:
                                parts_text.append(f"![PDF Preview]({thumbnail})")
                            
                            parts_text.append(f"<!-- PDF_METADATA: {meta} -->")
                            parts_text.append(f"[PDF Attachment: {file_name}]")
                    
                    content_str = "\n\n".join(parts_text)
                else:
                    # Handle direct attachments stored at the top level
                    if msg.get("attachmentData") and msg.get("attachmentType"):
                        if msg.get("attachmentType").startswith('image/'):
                            img_meta = json.dumps({
                                "name": msg.get("attachment", "Image"),
                                "type": msg.get("attachmentType"),
                                "base64": msg.get("attachmentBase64") or (msg.get("attachmentData", "").split(",")[1] if "," in msg.get("attachmentData", "") else None)
                            })
                            parts_text.append(f"![Image Preview]({msg.get('attachmentData')})")
                            parts_text.append(f"<!-- IMAGE_METADATA: {img_meta} -->")
                            parts_text.append(str(content))
                        elif msg.get("attachmentType") == 'application/pdf':
                            meta = json.dumps({
                                "name": msg.get("attachment"),
                                "pages": msg.get("attachmentNumPages", 0),
                                "base64": msg.get("attachmentBase64"),
                                "type": "application/pdf"
                            })
                            parts_text.append(f"![PDF Preview]({msg.get('attachmentData')})")
                            parts_text.append(f"<!-- PDF_METADATA: {meta} -->")
                            parts_text.append(str(content))
                        content_str = "\n\n".join(parts_text)
                    else:
                        content_str = str(content)
                    
                reasoning = msg.get("reasoning_content")
                if reasoning:
                    content_str = f"<reasoning>\n{reasoning}\n</reasoning>\n\n{content_str}"
                    
                timestamp = msg.get("timestamp", "")
                ts_meta = f"<!-- TIMESTAMP: {timestamp} -->" if timestamp else ""
                
                # Encode versions if present
                versions = msg.get("versions", [])
                versions_meta = ""
                if versions:
                    ver_json = json.dumps(versions)
                    ver_b64 = base64.b64encode(ver_json.encode('utf-8')).decode('utf-8')
                    versions_meta = f"<!-- VERSIONS: {ver_b64} -->"
                
                # Save active version index
                active_version_meta = ""
                if "activeVersionIndex" in msg:
                    active_version_meta = f"<!-- ACTIVE_VERSION: {msg['activeVersionIndex']} -->"
                
                formatted_content += f"**{role_marker}:**\n{ts_meta}\n{versions_meta}\n{active_version_meta}\n{content_str}\n\n"
                
            file_content = io.BytesIO(formatted_content.encode('utf-8'))
            
            file_metadata = {
                'name': f'DocMind_Chat_{title_summary.replace(" ", "_")}.md',
                'mimeType': 'text/markdown'
            }
            
            if file_id:
                media = MediaIoBaseUpload(file_content, mimetype='text/markdown', resumable=True)
                updated_file = service.files().update(
                    fileId=file_id,
                    body={'name': file_metadata['name']},
                    media_body=media
                ).execute()
                return {"success": True, "file_id": updated_file.get("id"), "name": updated_file.get("name")}
            else:
                media = MediaIoBaseUpload(file_content, mimetype='text/markdown', resumable=True)
                file = service.files().create(
                    body=file_metadata,
                    media_body=media,
                    fields='id, name'
                ).execute()
                return {"success": True, "file_id": file.get("id"), "name": file.get("name")}
                
        except (ConnectionError, TimeoutError) as net_err:
            # Actual network connectivity issue
            print(f"Network issue during Drive upload: {str(net_err)}")
            return {"success": False, "error": "connectivity_issue", "details": str(net_err)}
        except Exception as e:
            import traceback
            traceback.print_exc()
            return {"success": False, "error": str(e)}

    # Use the helper to handle refresh and retry
    try:
        result = _upload(access_token)
        # If it returned an error object that signifies auth issues, we might still need to catch it
        # But _upload usually raises exceptions.RefreshError which we catch in handle_refresh_and_retry
        return result
    except exceptions.RefreshError:
        print(f"DEBUG: Retrying upload with refreshed token for {user.email}")
        new_token = refresh_google_token(user.profile)
        if new_token:
            res = _upload(new_token)
            if isinstance(res, dict):
                res["new_google_token"] = new_token
            return res
        return {"success": False, "error": "unauthorized", "details": "Token expired and refresh failed"}

def list_drive_chats(user, access_token):
    """
    Lists all DocMind chat files in the user's Google Drive.
    """
    def _list(current_token):
        try:
            service = get_drive_service(current_token)
            query = "name contains 'DocMind_Chat_' and mimeType = 'text/markdown' and trashed = false"
            results = service.files().list(q=query, fields="files(id, name, modifiedTime, starred)", orderBy="modifiedTime desc").execute()
            items = results.get('files', [])
            
            return {
                "success": True,
                "files": items
            }
        except (ConnectionError, TimeoutError) as net_err:
            print(f"Network issue during Drive list: {str(net_err)}")
            return {"success": False, "error": "connectivity_issue", "details": str(net_err)}
        except Exception as e:
            import traceback
            traceback.print_exc()
            return {
                "success": False,
                "error": str(e)
            }

    try:
        return _list(access_token)
    except exceptions.RefreshError:
        new_token = refresh_google_token(user.profile)
        if new_token:
            res = _list(new_token)
            if isinstance(res, dict): res["new_google_token"] = new_token
            return res
        return {"success": False, "error": "unauthorized"}

def get_drive_chat_content(user, access_token, file_id):
    """
    Downloads the content of a specific chat file from Google Drive.
    """
    def _get(current_token):
        try:
            service = get_drive_service(current_token)
            request = service.files().get_media(fileId=file_id)
            file_content = request.execute()
            text_content = file_content.decode('utf-8')
            return {
                "success": True,
                "content": text_content
            }
        except (ConnectionError, TimeoutError) as net_err:
            print(f"Network issue during Drive content fetch: {str(net_err)}")
            return {"success": False, "error": "connectivity_issue", "details": str(net_err)}
        except Exception as e:
            import traceback
            traceback.print_exc()
            return {
                "success": False,
                "error": str(e)
            }

    try:
        return _get(access_token)
    except exceptions.RefreshError:
        new_token = refresh_google_token(user.profile)
        if new_token:
            res = _get(new_token)
            if isinstance(res, dict): res["new_google_token"] = new_token
            return res
        return {"success": False, "error": "unauthorized"}

def delete_chat_from_drive(user, access_token, file_id):
    """
    Trashes a chat file on Google Drive.
    """
    def _delete(current_token):
        try:
            service = get_drive_service(current_token)
            service.files().update(fileId=file_id, body={'trashed': True}).execute()
            return {"success": True}
        except (ConnectionError, TimeoutError) as net_err:
            print(f"Network issue during Drive delete: {str(net_err)}")
            return {"success": False, "error": "connectivity_issue", "details": str(net_err)}
        except Exception as e:
            import traceback
            traceback.print_exc()
            return {"success": False, "error": str(e)}

    try:
        return _delete(access_token)
    except exceptions.RefreshError:
        new_token = refresh_google_token(user.profile)
        if new_token:
            res = _delete(new_token)
            if isinstance(res, dict): res["new_google_token"] = new_token
            return res
        return {"success": False, "error": "unauthorized"}

def rename_chat_on_drive(user, access_token, file_id, new_name):
    """
    Renames a chat file on Google Drive.
    """
    def _rename(current_token):
        try:
            service = get_drive_service(current_token)
            # Ensure the filename maintains the expected pattern if not provided
            if not new_name.startswith('DocMind_Chat_'):
                clean_name = "".join([c if c.isalnum() or c in [' ', '-', '_'] else "" for c in new_name])
                full_name = f"DocMind_Chat_{clean_name.replace(' ', '_')}"
            else:
                full_name = new_name
                
            if not full_name.endswith('.md'):
                full_name += ".md"
                
            updated_file = service.files().update(fileId=file_id, body={'name': full_name}).execute()
            return {"success": True, "name": updated_file.get("name")}
        except (ConnectionError, TimeoutError) as net_err:
            print(f"Network issue during Drive rename: {str(net_err)}")
            return {"success": False, "error": "connectivity_issue", "details": str(net_err)}
        except Exception as e:
            import traceback
            traceback.print_exc()
            return {"success": False, "error": str(e)}

    try:
        return _rename(access_token)
    except exceptions.RefreshError:
        new_token = refresh_google_token(user.profile)
        if new_token:
            res = _rename(new_token)
            if isinstance(res, dict): res["new_google_token"] = new_token
            return res
        return {"success": False, "error": "unauthorized"}

def toggle_chat_star_on_drive(user, access_token, file_id, starred):
    """
    Toggles the starred status of a chat file on Google Drive.
    """
    def _toggle(current_token):
        try:
            service = get_drive_service(current_token)
            service.files().update(fileId=file_id, body={'starred': starred}).execute()
            return {"success": True}
        except (ConnectionError, TimeoutError) as net_err:
            print(f"Network issue during Drive star toggle: {str(net_err)}")
            return {"success": False, "error": "connectivity_issue", "details": str(net_err)}
        except Exception as e:
            import traceback
            traceback.print_exc()
            return {"success": False, "error": str(e)}

    try:
        return _toggle(access_token)
    except exceptions.RefreshError:
        new_token = refresh_google_token(user.profile)
        if new_token:
            res = _toggle(new_token)
            if isinstance(res, dict): res["new_google_token"] = new_token
            return res
        return {"success": False, "error": "unauthorized"}
