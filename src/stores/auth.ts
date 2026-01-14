import { Capacitor } from '@capacitor/core'; // НОВЫЙ ИМПОРТ
import { Preferences } from '@capacitor/preferences';
import { defineStore } from 'pinia';
import router from '../router';
import api from '../services/api';

const platform = Capacitor.getPlatform() as 'android' | 'ios' | 'web';

// Хелпер для условного использования Preferences или localStorage
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (platform !== 'web') {
      const { value } = await Preferences.get({ key });
      return value;
    } else {
      return localStorage.getItem(key);
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    if (platform !== 'web') {
      await Preferences.set({ key, value });
    } else {
      localStorage.setItem(key, value);
    }
  },
  async removeItem(key: string): Promise<void> {
    if (platform !== 'web') {
      await Preferences.remove({ key });
    } else {
      localStorage.removeItem(key);
    }
  },
};

interface User {
  id: number;
  name: string;
  email: string;
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
    token: null,
    isAuthenticated: false,
    loading: false,
    error: null,
  }),
  actions: {
    async loadToken() {
      const value = await storage.getItem('authToken'); // Используем хелпер
      this.token = value;
      this.isAuthenticated = !!value;
    },

    async login(credentials: { email: string; password: string }) {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.post('/login', credentials);

        const { user, access_token } = response.data;

        this.user = user;
        this.token = access_token;
        this.isAuthenticated = true;
        await storage.setItem('authToken', access_token); // Используем хелпер

        router.push('/dashboard');
      } catch (error: any) {
        this.error = error.response?.data?.message || 'Login failed';
        console.error('Login error:', error);
      } finally {
        this.loading = false;
      }
    },

    async register(userData: {
      name: string;
      email: string;
      password: string;
      password_confirmation: string;
    }) {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.post('/register', userData);
        const { user, token } = response.data;

        this.user = user;
        this.token = token;
        this.isAuthenticated = true;
        await storage.setItem('authToken', token); // Используем хелпер

        router.push('/dashboard');
      } catch (error: any) {
        this.error = error.response?.data?.message || 'Registration failed';
        console.error('Registration error:', error);
      } finally {
        this.loading = false;
      }
    },

    async logout() {
      this.user = null;
      this.token = null;
      this.isAuthenticated = false;
      await storage.removeItem('authToken'); // Используем хелпер

      router.push('/login');
    },

    async checkAuth() {
      if (!this.token && !this.user) {
        await this.loadToken();
      }

      if (this.token && !this.user) {
        try {
          const response = await api.get('/user');
          this.user = response.data;
          this.isAuthenticated = true;
        } catch (error) {
          console.error('Failed to fetch user on auth check:', error);
          await this.logout();
        }
      } else if (!this.token) {
        this.isAuthenticated = false;
      }
    },
  },
});
