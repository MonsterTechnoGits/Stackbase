import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  format: ['cjs'],
  target: 'node20',
  platform: 'node',
  splitting: false,
  clean: true,
  sourcemap: false,
  noExternal: [/.*/],
  skipNodeModulesBundle: false,
});
