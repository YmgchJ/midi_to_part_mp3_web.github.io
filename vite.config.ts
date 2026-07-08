/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { resolve } from 'path';

function resolveGithubPagesBase(): string {
  const repository = process.env.GITHUB_REPOSITORY;
  if (!repository) return '/';

  const [owner, repoName = ''] = repository.split('/');
  if (repoName.toLowerCase() === `${owner?.toLowerCase()}.github.io`) {
    return '/';
  }
  return `/${repoName}/`;
}

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? resolveGithubPagesBase() : '/',

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },

  worker: {
    format: 'es' as const,
  },

  build: {
    outDir: 'dist',
    target: 'es2020',
  },

  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
  },
}));
