import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { useAuthStore } from './stores/auth'; // Импортируем хранилище

import './assets/css/style.css';
import './assets/css/tw.css';

const app = createApp(App);

app.use(createPinia());
app.use(router);

// Проверяем наличие аутентификации при запуске приложения
const authStore = useAuthStore();
authStore.checkAuth();

app.mount('#app');
