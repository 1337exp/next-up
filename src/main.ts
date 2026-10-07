import { createApp } from 'vue';
import { createPinia } from 'pinia';
import TaoUI from '@1337exp/taoui';

import '@1337exp/taoui/styles.css';
import '@/assets/fontello/css/fontello.css';
import '@/assets/fontello/css/animation.css';
import '@/assets/font/roboto.css';
import '@/styles/app.css';

import App from '@/App.vue';

createApp(App).use(createPinia()).use(TaoUI).mount('#app');
