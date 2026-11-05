import { readFileSync } from 'node:fs';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';
import { precache } from './build/precache';

// единственное место версии — package.json: отсюда её берут интерфейс (ниже) и сборка Android (android/app/build.gradle)
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig({
    define: { __APP_VERSION__: JSON.stringify(version) },
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
