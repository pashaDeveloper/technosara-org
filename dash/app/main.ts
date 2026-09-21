import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './app.vue';
import { router } from './router';
import { panelText, panelDate } from './utils/panelText';
import './app.css';

const app = createApp(App);
app.config.globalProperties.$text = panelText;
app.config.globalProperties.$date = panelDate;
app.use(createPinia());
app.use(router);
app.mount('#app');
