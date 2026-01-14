import { defineStore } from 'pinia';
import api from '../services/api';

interface User {
  id: number;
  name: string;
  email: string;
  // Добавьте другие свойства пользователя по мере необходимости
}

interface UsersState {
  users: User[];
  loading: boolean;
  error: string | null;
}

export const useUsersStore = defineStore('users', {
  state: (): UsersState => ({
    users: [],
    loading: false,
    error: null,
  }),
  actions: {
    async fetchUsers() {
      this.loading = true;
      this.error = null;
      try {
        // Настройте конечную точку для вашего Laravel API
        const response = await api.get('/users'); 
        
        this.users = response.data; // Предполагается, что API возвращает { data: [...] }
      } catch (error: any) {
        this.error = error.response?.data?.message || 'Failed to fetch users';
        console.error('Fetch users error:', error);
      } finally {
        this.loading = false;
      }
    },
  },
});
