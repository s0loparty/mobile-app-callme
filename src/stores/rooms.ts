import { defineStore } from 'pinia';
import api from '../services/api';

interface Room {
  id: number;
  name: string;
  is_private: boolean;
  owner_id: number;
  // Добавьте другие свойства комнаты по мере необходимости
}

interface RoomsState {
  rooms: Room[];
  loading: boolean;
  error: string | null;
}

export const useRoomsStore = defineStore('rooms', {
  state: (): RoomsState => ({
    rooms: [],
    loading: false,
    error: null,
  }),
  actions: {
    async fetchRooms() {
      this.loading = true;
      this.error = null;
      try {
        // Настройте конечную точку для вашего Laravel API
        const response = await api.get('/rooms'); 
        this.rooms = response.data.data; // Предполагается, что API возвращает { data: [...] }
      } catch (error: any) {
        this.error = error.response?.data?.message || 'Failed to fetch rooms';
        console.error('Fetch rooms error:', error);
      } finally {
        this.loading = false;
      }
    },

    async createRoom(roomData: { name: string; is_private: boolean; password?: string }) {
      this.loading = true;
      this.error = null;
      try {
        // Настройте конечную точку для вашего Laravel API
        const response = await api.post('/rooms', roomData);
        // При желании, добавьте новую комнату в состояние
        // this.rooms.push(response.data.data); 
        return response.data.data; // Вернуть созданную комнату
      } catch (error: any) {
        this.error = error.response?.data?.message || 'Failed to create room';
        console.error('Create room error:', error);
        throw error; // Повторно выбросить, чтобы компонент мог обработать
      } finally {
        this.loading = false;
      }
    },

    async joinRoom(roomId: number, password?: string) {
      this.loading = true;
      this.error = null;
      try {
        // Настройте конечную точку для вашего Laravel API
        const response = await api.post(`/rooms/${roomId}/join`, { password });
        return response.data.data; // Вернуть детали комнаты или подтверждение присоединения
      } catch (error: any) {
        this.error = error.response?.data?.message || 'Failed to join room';
        console.error('Join room error:', error);
        throw error; // Повторно выбросить, чтобы компонент мог обработать
      } finally {
        this.loading = false;
      }
    },
  },
});
