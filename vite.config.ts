/// <reference types="vitest" />
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/midi_to_part_mp3_web.github.io/' : '/',

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
