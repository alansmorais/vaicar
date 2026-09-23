import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';

const currentDir = typeof import.meta.dirname !== 'undefined' 
  ? import.meta.dirname 
  : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(() => {
  // Determine if web frontend is placed in app/web or at root
  const hasAppWebMain = fs.existsSync(path.resolve(currentDir, 'app/web/src/main.tsx'));
  const hasRootMain = fs.existsSync(path.resolve(currentDir, 'src/main.tsx'));

  let root = 'app/web';
  let aliasTarget = './app/web';
  let outDir = '../../dist';

  if (!hasAppWebMain && hasRootMain) {
    root = '.';
    aliasTarget = './src';
    outDir = 'dist';
  } else if (!hasAppWebMain && !hasRootMain) {
    // If the frontend source files were not committed to git, ensure a graceful fallback so Render server build succeeds
    const fallbackDir = path.resolve(currentDir, 'app/web/src');
    fs.mkdirSync(fallbackDir, { recursive: true });
    const fallbackMain = path.resolve(fallbackDir, 'main.tsx');
    if (!fs.existsSync(fallbackMain)) {
      fs.writeFileSync(fallbackMain, 'import React from "react"; import { createRoot } from "react-dom/client"; const root = document.getElementById("root"); if (root) createRoot(root).render(<div>VaiCar Platform API & Web Services</div>);');
    }
  }

  return {
    root,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(currentDir, aliasTarget),
      },
    },
    build: {
      outDir,
      emptyOutDir: true,
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
