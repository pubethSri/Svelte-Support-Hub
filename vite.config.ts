import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';
import { enhancedImages } from '@sveltejs/enhanced-img';


export default defineConfig({
	plugins: [tailwindcss(), sveltekit(), enhancedImages()],
	server: {
		allowedHosts: ['netblocker.it.kmitl.ac.th']
	},
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		environment: 'jsdom'
	}
});
