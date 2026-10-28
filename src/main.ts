import { createApp } from 'vue';
import { createPinia } from 'pinia';
import TaoUI from '@1337exp/taoui';

import '@1337exp/taoui/styles.css';
import '@1337exp/taoui/palettes.css';
import '@/assets/font/roboto.css';
import '@/styles.css';

import App from '@/App.vue';
import { registerAppIcons } from '@/app/icons';
import { initLocale } from '@/i18n';

registerAppIcons();
initLocale();

createApp(App).use(createPinia()).use(TaoUI).mount('#app');
