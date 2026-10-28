import { mount } from '@vue/test-utils';
import { expect, it } from 'vitest';
import TaoUI from '@1337exp/taoui';
import App from '@/App.vue';

it('каркас монтируется', () => {
    const wrapper = mount(App, { global: { plugins: [TaoUI] } });
    expect(wrapper.text()).toContain('Активные');
});
