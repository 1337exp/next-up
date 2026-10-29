import { mount } from '@vue/test-utils';
import { createPinia } from 'pinia';
import { expect, it } from 'vitest';
import TaoUI from '@1337exp/taoui';
import App from '@/App.vue';
import { setLocale } from '@/i18n';

it('приложение монтируется и показывает разделы', () => {
    localStorage.clear();
    setLocale('ru');
    const wrapper = mount(App, { global: { plugins: [createPinia(), TaoUI] } });
    expect(wrapper.text()).toContain('Ничего не запланировано');
    expect(document.documentElement.classList.contains('tao-size-medium')).toBe(true);
});
