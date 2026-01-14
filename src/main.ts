import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { useAuthStore } from './stores/auth'; // Импортируем хранилище

import { configureEcho } from '@laravel/echo-vue';
import './assets/css/style.css';
import './assets/css/tw.css';

configureEcho({
  broadcaster: 'reverb',
  key: import.meta.env.VITE_REVERB_APP_KEY,
  wsHost: import.meta.env.VITE_REVERB_HOST,
  wsPort: import.meta.env.VITE_REVERB_PORT,
  wssPort: import.meta.env.VITE_REVERB_PORT,
  forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'https') === 'https',
  enabledTransports: ['ws', 'wss'],
});

const app = createApp(App);

app.use(createPinia());
app.use(router);

// Проверяем наличие аутентификации при запуске приложения
const authStore = useAuthStore();
await authStore.loadToken(); // Ждем загрузки токена из preferences
authStore.checkAuth(); // Затем проверяем статус аутентификации, который может сделать вызов API

app.mount('#app');
