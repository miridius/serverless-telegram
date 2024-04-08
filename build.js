import * as esbuild from 'esbuild';
import dts from 'npm-dts';

const sharedConfig = {
  entryPoints: ['./src/index.ts'],
  platform: 'node',
  bundle: true,
  minify: true,
  sourcemap: 'linked',
};

await Promise.all([
  // type declarations
  new dts.Generator({
    entry: 'src/index.ts',
    output: 'dist/index.d.ts',
  }).generate(),

  // CJS
  esbuild.build({
    ...sharedConfig,
    format: 'cjs',
    outfile: 'dist/index.cjs',
  }),

  // ESM
  esbuild.build({
    ...sharedConfig,
    outfile: 'dist/index.mjs',
    format: 'esm',
  }),
]);
