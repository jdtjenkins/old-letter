// @ts-check
import { defineConfig, fontProviders} from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import solidJs from '@astrojs/solid-js';

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [tailwindcss()]
  },

  integrations: [solidJs()],

  experimental: {
    fonts: [
      {
        provider: fontProviders.google(),
        name: "Lovers Quarrel",
        cssVariable: "--font-lovers-quarrel",
		weights: ["400"],
		styles: ["normal"],
      }
    ]
  }
});