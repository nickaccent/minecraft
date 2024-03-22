/**
 * @type {import('vite').UserConfig}
 */

import glsl from 'vite-plugin-glsl'

export default {
  build: {
    sourcemap: true,
  },
  plugins:
  [
      glsl()
  ]
};
