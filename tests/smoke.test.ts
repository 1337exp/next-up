import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import TaoUI, { TaoButton, TaoIcon } from '@1337exp/taoui';

// Страховка этапа 0: TaoUi подключается в чистом Vue (без Nuxt) и рендерит компоненты.
describe('TaoUi без Nuxt', () => {
    it('ставится как плагин и рендерит TaoButton', () => {
        const w = mount(TaoButton, { props: { variant: 'primary' }, slots: { default: 'Ок' }, global: { plugins: [TaoUI] } });
        expect(w.text()).toBe('Ок');
    });

    it('TaoIcon отдаёт класс icon-<name> для fontello', () => {
        const w = mount(TaoIcon, { props: { name: 'plus' }, global: { plugins: [TaoUI] } });
        expect(w.html()).toContain('icon-plus');
    });
});
