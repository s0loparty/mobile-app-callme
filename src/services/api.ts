import axios from 'axios';
import { useAuthStore } from '../stores/auth'; // Будет создан далее
const { VITE_API_BASE_URL } = import.meta.env;

const API_BASE_URL = VITE_API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: false,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
});

// Перехватчик запросов для добавления заголовка авторизации
api.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore();
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Перехватчик ответов для обработки истечения срока действия токена или других глобальных ошибок
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const authStore = useAuthStore();
    if (error.response?.status === 401 && authStore.token) {
      // Токен может быть просрочен или недействителен, попытаться обновить или выйти из системы
      // Для простоты мы просто очистим токен и перенаправим на страницу входа
      authStore.logout();
      // Здесь можно было бы добавить router.push('/login'), но лучше это обрабатывать на уровне компонента
    }
    return Promise.reject(error);
  }
);

export default api;