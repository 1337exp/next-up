import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
    // Относительные пути: приложение можно положить в любую подпапку сайта.
    base: './',
    plugins: [vue()],
    resolve: {
        alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
        // библиотеки подключены через file:, им нужна та же копия Vue, что у приложения
        dedupe: ['vue'],
    },
    test: {
        environment: 'happy-dom',
        include: ['tests/**/*.test.ts'],
    },
});
