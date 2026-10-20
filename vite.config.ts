import { execSync } from 'node:child_process';
import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/** The commit being built: Cloudflare Pages and GitHub Actions provide it; locally ask git. */
function resolveCommit(): string {
  const fromCi = process.env.CF_PAGES_COMMIT_SHA || process.env.GITHUB_SHA;
  if (fromCi) return fromCi;
  try {
    return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return 'unknown';
  }
}

const commit = resolveCommit();
const builtAt = new Date().toISOString();

/** Publishes /version.json so anyone can check which commit is live. */
function versionFile(): Plugin {
  return {
    name: 'version-file',
    apply: 'build',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ commit, builtAt, branch: process.env.CF_PAGES_BRANCH ?? null }, null, 2)
      });
    }
  };
}

export default defineConfig({
  plugins: [tailwindcss(), react(), versionFile()],
  define: {
    __APP_COMMIT__: JSON.stringify(commit.slice(0, 7)),
    __APP_BUILT_AT__: JSON.stringify(builtAt)
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    host: true,
    port: 5173
  }
});
