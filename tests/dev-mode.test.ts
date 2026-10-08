import { describe, expect, it } from 'vitest';
import { isDevHost, resolveDevMode } from '@/dev/mode';

describe('режим разработки', () => {
    it('заход по IP-адресу и на localhost — это стенд разработчика', () => {
        for (const host of ['192.168.1.5', '10.0.0.1', '127.0.0.1', '[::1]', '[fe80::1]', 'localhost', 'app.localhost', 'LOCALHOST']) {
            expect(isDevHost(host), host).toBe(true);
        }
    });

    it('обычный домен и похожие на IP имена — не стенд', () => {
        for (const host of ['example.com', 'next-up.app', '1.2.3.example.com', '1.2.3', 'localhost.example.com', '']) {
            expect(isDevHost(host), host).toBe(false);
        }
    });

    it('на публичном домене режим выключен, если ничего не включало его', () => {
        expect(resolveDevMode({ hostname: 'example.com', flag: null, isDevBuild: false })).toBe(false);
    });

    it('флаг «1» включает принудительно даже на публичном домене, что позволяет отлаживать прод', () => {
        expect(resolveDevMode({ hostname: 'example.com', flag: '1', isDevBuild: false })).toBe(true);
    });

    it('флаг «0» выключает даже при заходе по IP и в сборке для разработки', () => {
        expect(resolveDevMode({ hostname: '192.168.1.5', flag: '0', isDevBuild: false })).toBe(false);
        expect(resolveDevMode({ hostname: 'localhost', flag: '0', isDevBuild: true })).toBe(false);
    });

    it('неизвестное значение флага игнорируется: решают адрес и сборка', () => {
        expect(resolveDevMode({ hostname: 'example.com', flag: 'yes', isDevBuild: false })).toBe(false);
        expect(resolveDevMode({ hostname: '10.0.0.1', flag: 'yes', isDevBuild: false })).toBe(true);
        expect(resolveDevMode({ hostname: 'example.com', flag: null, isDevBuild: true })).toBe(true);
    });
});
