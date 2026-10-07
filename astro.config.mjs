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
      },
	  {
        provider: fontProviders.google(),
        name: "Cinzel",
        cssVariable: "--font-cinzel",
		weights: ["400", "500", "600"],
		styles: ["normal", "italic"],
      },
	  {
        provider: fontProviders.google(),
        name: "IM Fell English",
        cssVariable: "--font-im-fell",
		weights: ["400", "500", "600"],
		styles: ["normal", "italic"],
      }
    ]
  }
});