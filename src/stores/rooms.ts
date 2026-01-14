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
  publicRooms: Room[];
  userRooms: Room[];
  loading: boolean;
  error: string | null;
}

export const useRoomsStore = defineStore('rooms', {
  state: (): RoomsState => ({
    publicRooms: [],
    userRooms: [],
    loading: false,
    error: null,
  }),
  actions: {
    async fetchRooms() {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.get('/rooms');
        this.publicRooms = response.data.public_rooms;
        this.userRooms = response.data.user_rooms;
      } catch (error: any) {
        this.error = error.response?.data?.message || 'Failed to fetch rooms';
        console.error('Fetch rooms error:', error);
      } finally {
        this.loading = false;
      }
    },

    async createRoom(roomData: {
      name: string;
      is_private: boolean;
      password?: string;
    }) {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.post('/rooms', roomData);
        // After creating a room, we should refetch all rooms to stay in sync
        await this.fetchRooms();
        return response.data; // Return the created room
      } catch (error: any) {
        this.error = error.response?.data?.message || 'Failed to create room';
        console.error('Create room error:', error);
        throw error; // Re-throw to allow component to handle
      } finally {
        this.loading = false;
      }
    },

    async joinRoom(
      roomId: number,
      password?: string,
    ): Promise<{ token: string; livekit_host: string }> {
      this.loading = true;
      this.error = null;
      try {
        const payload: { password?: string } = {};
        if (password) {
          payload.password = password;
        }
        const response = await api.post(`/rooms/${roomId}/join`, payload);
        return {
          token: response.data.token,
          livekit_host: response.data.livekit_host,
        };
      } catch (error: any) {
        this.error = error.response?.data?.message || 'Failed to join room';
        console.error('Join room error:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async initiateOneToOneCall(
      userId: number,
    ): Promise<{ room_id: number; token: string; livekit_host: string }> {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.post(`/users/${userId}/call`);
        return response.data;
      } catch (error: any) {
        this.error = error.response?.data?.message || 'Failed to initiate call';
        console.error('Initiate call error:', error);
        throw error;
      } finally {
        this.loading = false;
      }
    },
  },
});
