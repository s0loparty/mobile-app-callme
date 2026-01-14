import { defineStore } from 'pinia';
import api from '../services/api';
import router from '../router'; // Для перенаправления после входа/выхода

interface User {
  id: number;
  name: string;
  email: string;
  // Добавьте другие свойства пользователя по мере необходимости
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    token: localStorage.getItem('authToken') || null, // Сохранение токена
    isAuthenticated: !!localStorage.getItem('authToken'),
    loading: false,
    error: null,
  }),
  getters: {
    //
  },
  actions: {
    async login(credentials: { email: string; password: string }) {
      this.loading = true;
      this.error = null;
      try {
        // Настройте конечную точку для вашей конфигурации Laravel Sanctum
        const response = await api.post('/login', credentials); 
        const { user, token } = response.data; // Настройте в соответствии со структурой ответа вашего API

        this.user = user;
        this.token = token; // Laravel Sanctum может возвращать обычный текстовый токен или устанавливать cookie
        this.isAuthenticated = true;
        localStorage.setItem('authToken', token);

        router.push('/dashboard'); // Перенаправление на дашборд после успешного входа
      } catch (error: any) {
        this.error = error.response?.data?.message || 'Login failed';
        console.error('Login error:', error);
      } finally {
        this.loading = false;
      }
    },

    async register(userData: { name: string; email: string; password: string; password_confirmation: string }) {
      this.loading = true;
      this.error = null;
      try {
        // Настройте конечную точку для вашей конфигурации Laravel Sanctum
        const response = await api.post('/register', userData);
        const { user, token } = response.data; // Настройте в соответствии со структурой ответа вашего API

        this.user = user;
        this.token = token;
        this.isAuthenticated = true;
        localStorage.setItem('authToken', token);

        router.push('/dashboard'); // Перенаправление на дашборд после успешной регистрации
      } catch (error: any) {
        this.error = error.response?.data?.message || 'Registration failed';
        console.error('Registration error:', error);
      } finally {
        this.loading = false;
      }
    },

    logout() {
      this.user = null;
      this.token = null;
      this.isAuthenticated = false;
      localStorage.removeItem('authToken');
      // При желании, вы можете сделать недействительным токен на сервере
      // api.post('/logout'); // Настройте конечную точку, если необходимо
      router.push('/login'); // Перенаправление на страницу входа после выхода
    },

    // Дополнительно: метод для проверки статуса аутентификации при запуске приложения
    async checkAuth() {
      if (this.token && !this.user) {
        try {
          // Настройте конечную точку для получения данных аутентифицированного пользователя
          const response = await api.get('/user'); 
          this.user = response.data;
          this.isAuthenticated = true;
        } catch (error) {
          console.error('Failed to fetch user on auth check:', error);
          this.logout(); // Токен может быть недействителен, выходим из системы
        }
      }
    }
  },
});