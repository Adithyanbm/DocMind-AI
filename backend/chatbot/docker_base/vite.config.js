import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Dynamically discover all Day.js plugins to avoid "Whack-a-mole" errors
let dayjsPlugins = []
try {
  const pluginDir = path.resolve(__dirname, 'node_modules/dayjs/plugin')
  if (fs.existsSync(pluginDir)) {
    dayjsPlugins = fs.readdirSync(pluginDir)
      .filter(file => file.endsWith('.js'))
      .map(file => `dayjs/plugin/${file.replace('.js', '')}`)
  }
} catch (e) {
  console.error('Error scanning dayjs plugins:', e)
}

// Comprehensive list of Ant Design's core "engines" (CommonJS utilities)
// By force-optimizing these, we prevent the "missing default export" errors in the browser
const CORE_ENGINES = [
  'json2mq', 'rc-util', 'classnames', 'react-is', 'rc-slider', 'rc-table',
  'rc-pagination', 'rc-picker', 'rc-notification', 'rc-tooltip',
  'rc-dropdown', 'rc-menu', 'rc-select', 'rc-tree', 'rc-tree-select',
  'rc-cascader', 'rc-input-number', 'rc-input', 'rc-textarea',
  'rc-checkbox', 'rc-radio', 'rc-switch', 'rc-upload', 'rc-progress',
  'rc-tabs', 'rc-steps', 'rc-image', 'rc-dialog', 'rc-drawer',
  'rc-collapse', 'rc-mentions', 'rc-segmented', 'rc-rate', 'rc-motion',
  'rc-overflow', 'rc-resize-observer', 'rc-virtual-list'
];

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    cors: true,
    hmr: {
      clientPort: process.env.VITE_CLIENT_PORT || 5173,
      host: '127.0.0.1',
    },
    watch: {
      usePolling: true,
      interval: 1000,
    },
  },
  optimizeDeps: {
    include: [
      'react', 'react-dom', 'react-is',
      'dayjs', ...dayjsPlugins,
      ...CORE_ENGINES,
      'framer-motion', 'react-confetti', 'lucide-react', 'recharts', 
      'clsx', 'tailwind-merge', 'three', '@react-three/fiber', '@react-three/drei',
      'zustand', 'jotai', 'axios', 'date-fns'
    ],
    exclude: [
      'antd', '@ant-design/icons',
      '@fluentui/react', '@chakra-ui/react', '@emotion/react', '@emotion/styled',
      '@mui/material', '@mantine/core', 'flowbite-react'
    ],
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
  resolve: {
    mainFields: ['module', 'main'],
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
})
