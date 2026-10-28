import { createApp } from 'vue';
import { createPinia } from 'pinia';
import TaoUI, { localeRu } from '@1337exp/taoui';

import '@1337exp/taoui/styles.css';
import '@1337exp/taoui/palettes.css';
import '@/assets/font/roboto.css';
import '@/styles.css';

import App from '@/App.vue';

// Класс размера и плотности на <html>: их читают и всплывающие панели, телепортированные в body.
document.documentElement.classList.add('tao-size-medium', 'tao-density-auto');

createApp(App).use(createPinia()).use(TaoUI, { locale: localeRu }).mount('#app');
