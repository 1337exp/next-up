import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { precache } from './build/precache';

export default defineConfig({
    // Относительные пути: приложение можно положить в любую подпапку сайта.
    base: './',
    plugins: [vue(), precache()],
    resolve: {
        alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    test: {
        environment: 'happy-dom',
        include: ['tests/**/*.test.ts'],
    },
});
