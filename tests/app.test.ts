import { beforeEach, describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import TaoUI from '@1337exp/taoui';
import App from '@/App.vue';

function mountApp() {
    const pinia = createPinia();
    setActivePinia(pinia);
    return mount(App, { global: { plugins: [pinia, TaoUI] }, attachTo: document.body });
}

describe('первый запуск и язык', () => {
    beforeEach(() => {
        localStorage.clear();
        document.body.innerHTML = '';
        Object.defineProperty(navigator, 'languages', { value: ['en-US'], configurable: true });
    });

    it('без сохранённого языка показывает экран выбора с обоими языками', () => {
        const w = mountApp();
        expect(w.text()).toContain('Русский');
        expect(w.text()).toContain('English');
        expect(w.text()).toContain('You can change the language later in settings.');
        w.unmount();
    });

    it('предложенный язык выделен и получает фокус', () => {
        const w = mountApp();
        const suggested = w.find('[data-suggested]');
        expect(suggested.text()).toBe('English');
        expect(document.activeElement).toBe(suggested.element);
        w.unmount();
    });

    it('клик по языку сохраняет выбор и открывает приложение на этом языке', async () => {
        const w = mountApp();
        const ru = w.findAll('button').find((b) => b.text() === 'Русский');
        await ru!.trigger('click');
        await nextTick();

        expect(w.text()).not.toContain('Язык · Language');
        expect(w.text()).toContain('Нет записей');
        expect(JSON.parse(localStorage.getItem('nextup-settings') ?? '{}').locale).toBe('ru');
        w.unmount();
    });

    it('при следующем запуске экран выбора не показывается', () => {
        localStorage.setItem('nextup-settings', JSON.stringify({ schemaVersion: 1, locale: 'en' }));
        const w = mountApp();
        expect(w.text()).not.toContain('Язык · Language');
        expect(w.text()).toContain('No entries');
        w.unmount();
    });

    it('язык меняется в настройках без перезагрузки', async () => {
        localStorage.setItem('nextup-settings', JSON.stringify({ schemaVersion: 1, locale: 'en' }));
        const w = mountApp();
        await w.find('button[aria-label="Settings"]').trigger('click');
        await nextTick();

        const option = [...document.body.querySelectorAll<HTMLInputElement>('input[type="radio"]')].find((i) => i.value === 'ru');
        expect(option).toBeTruthy();
        option!.click();
        option!.dispatchEvent(new Event('change', { bubbles: true }));
        await nextTick();

        expect(w.text()).toContain('Нет записей');
        expect(document.documentElement.lang).toBe('ru');
        expect(JSON.parse(localStorage.getItem('nextup-settings') ?? '{}').locale).toBe('ru');
        w.unmount();
    });

    it('ширина «Мини» ограничивает корень приложения, «Авто» снимает ограничение', async () => {
        localStorage.setItem('nextup-settings', JSON.stringify({ schemaVersion: 1, locale: 'en' }));
        const w = mountApp();
        const root = w.find('.app');
        expect(root.attributes('data-width')).toBe('auto');
        expect(root.attributes('style') ?? '').not.toContain('--nextup-max-width');

        await w.find('button[aria-label="Settings"]').trigger('click');
        await nextTick();
        const pick = async (value: string) => {
            const option = [...document.body.querySelectorAll<HTMLInputElement>('input[type="radio"]')].find((i) => i.value === value);
            expect(option, value).toBeTruthy();
            option!.click();
            option!.dispatchEvent(new Event('change', { bubbles: true }));
            await nextTick();
        };

        await pick('mini');
        expect(root.attributes('data-width')).toBe('mini');
        expect(root.attributes('style')).toContain('--nextup-max-width: 400px');
        expect(JSON.parse(localStorage.getItem('nextup-settings') ?? '{}').width).toBe('mini');

        await pick('auto');
        expect(root.attributes('data-width')).toBe('auto');
        expect(root.attributes('style') ?? '').not.toContain('--nextup-max-width');
        w.unmount();
    });
});
