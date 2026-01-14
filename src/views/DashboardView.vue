<template>
  <div class="min-h-screen bg-gray-100 flex flex-col">
    <!-- Header -->
    <header class="bg-indigo-600 text-white p-4 flex justify-between items-center">
      <div>
        <h1 class="text-xl font-semibold">Привет, {{ authStore.user?.name }}!</h1>
        <p class="text-sm text-indigo-200">{{ authStore.user?.email }}</p>
      </div>
      <button @click="authStore.logout()" class="px-3 py-1 rounded-md bg-indigo-700 hover:bg-indigo-800 text-sm">
        Выйти
      </button>
    </header>

    <!-- Tabs -->
    <nav class="bg-white shadow-md">
      <div class="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        <div class="relative flex items-center justify-around h-12">
          <button @click="activeTab = 'users'"
                  :class="{'border-indigo-500 text-indigo-600': activeTab === 'users', 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300': activeTab !== 'users'}"
                  class="whitespace-nowrap flex-1 px-1 py-3 text-center border-b-2 font-medium text-sm">
            Пользователи
          </button>
          <button @click="activeTab = 'rooms'"
                  :class="{'border-indigo-500 text-indigo-600': activeTab === 'rooms', 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300': activeTab !== 'rooms'}"
                  class="whitespace-nowrap flex-1 px-1 py-3 text-center border-b-2 font-medium text-sm">
            Комнаты
          </button>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <main class="flex-1 overflow-y-auto p-4">
      <!-- Users Tab Content -->
      <div v-if="activeTab === 'users'">
        <h2 class="text-2xl font-bold text-gray-800 mb-4">Все пользователи</h2>
        <div v-if="usersStore.loading" class="text-center text-gray-500">Загрузка пользователей...</div>
        <div v-else-if="usersStore.error" class="text-red-500 text-center">{{ usersStore.error }}</div>
        <ul v-else-if="usersStore.users.length" class="space-y-2">
          <li v-for="user in usersStore.users" :key="user.id"
              class="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
            <span>{{ user.name }} ({{ user.email }})</span>
            <button @click="startOneToOneCall(user.id)"
                    class="px-3 py-1 rounded-md bg-green-500 hover:bg-green-600 text-white text-sm">
              Позвонить
            </button>
          </li>
        </ul>
        <div v-else class="text-center text-gray-500">Пользователи не найдены.</div>
      </div>

      <!-- Rooms Tab Content -->
      <div v-if="activeTab === 'rooms'" class="space-y-6">
        <div class="flex justify-between items-center">
          <h2 class="text-2xl font-bold text-gray-800">Комнаты</h2>
          <button @click="showCreateRoomModal = true"
                  class="px-4 py-2 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm flex items-center gap-x-1">
                  <PlusIcon class="size-4"/>
            Создать комнату
          </button>
        </div>

        <div v-if="roomsStore.loading" class="text-center text-gray-500">Загрузка комнат...</div>
        <div v-else-if="roomsStore.error" class="text-red-500 text-center">{{ roomsStore.error }}</div>
        
        <div v-else>
          <!-- My Rooms -->
          <div>
            <h3 class="text-xl font-semibold text-gray-700 mb-3">Мои комнаты</h3>
            <ul v-if="roomsStore.userRooms.length" class="space-y-2">
              <li v-for="room in roomsStore.userRooms" :key="room.id"
                  class="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                <span>
                  {{ room.name }} 
                  <span v-if="room.is_private" class="text-yellow-600 text-xs">(Приватная)</span>
                </span>
                <button @click="joinRoom(room.id, room.is_private)"
                        class="px-3 py-1 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm">
                  Войти
                </button>
              </li>
            </ul>
            <div v-else class="text-center text-gray-500 text-sm py-4">Вы еще не создали ни одной комнаты.</div>
          </div>

          <!-- Public Rooms -->
          <div class="mt-6">
            <h3 class="text-xl font-semibold text-gray-700 mb-3">Публичные комнаты</h3>
            <ul v-if="roomsStore.publicRooms.length" class="space-y-2">
              <li v-for="room in roomsStore.publicRooms" :key="room.id"
                  class="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                <span>
                  {{ room.name }}
                </span>
                <button @click="joinRoom(room.id, room.is_private)"
                        class="px-3 py-1 rounded-md bg-blue-500 hover:bg-blue-600 text-white text-sm">
                  Присоединиться
                </button>
              </li>
            </ul>
            <div v-else class="text-center text-gray-500 text-sm py-4">Нет доступных публичных комнат.</div>
          </div>
        </div>
      </div>
    </main>

    <!-- Create Room Modal (Placeholder) -->
    <div v-if="showCreateRoomModal" class="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4">
      <div class="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
        <h3 class="text-lg font-medium mb-4">Создать комнату</h3>
        <input type="text" v-model="newRoomName" placeholder="Название комнаты" class="block w-full border-gray-300 rounded-md shadow-sm mb-2">
        <label class="flex items-center mb-4">
          <input type="checkbox" v-model="newRoomIsPrivate" class="form-checkbox">
          <span class="ml-2 text-sm text-gray-700">Приватная комната</span>
        </label>
        <input type="password" v-if="newRoomIsPrivate" v-model="newRoomPassword" placeholder="Пароль (если приватная)" class="block w-full border-gray-300 rounded-md shadow-sm mb-4">
        <div class="flex justify-end space-x-2">
          <button @click="showCreateRoomModal = false" class="px-4 py-2 rounded-md border text-sm">Отмена</button>
          <button @click="handleCreateRoom" class="px-4 py-2 rounded-md bg-indigo-600 text-white text-sm">Создать</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useUsersStore } from '../stores/users';
import { useRoomsStore } from '../stores/rooms';
import { PlusIcon } from 'lucide-vue-next';

const router = useRouter();
const authStore = useAuthStore();
const usersStore = useUsersStore();
const roomsStore = useRoomsStore();

const activeTab = ref('users'); // 'users' or 'rooms'

const showCreateRoomModal = ref(false);
const newRoomName = ref('');
const newRoomIsPrivate = ref(false);
const newRoomPassword = ref('');

onMounted(() => {
  usersStore.fetchUsers();
  roomsStore.fetchRooms();
});

const startOneToOneCall = async (userId: number) => {
  try {
    const { room_id, token, livekit_host } = await roomsStore.initiateOneToOneCall(userId);
    router.push({
      name: 'RoomSetup',
      params: { roomId: room_id.toString() },
      query: { token, livekit_host }
    });
  } catch (error) {
    alert(roomsStore.error || 'Не удалось начать звонок.');
  }
};

const joinRoom = async (roomId: number, isPrivate: boolean) => {
  let password = undefined;
  if (isPrivate) {
    // In a real app, you'd show a modal to ask for password
    password = prompt('Введите пароль комнаты:');
    if (!password) return; // User cancelled
  }
  try {
    const { token, livekit_host } = await roomsStore.joinRoom(roomId, password); // Capture token and livekit_host
    router.push({
      name: 'RoomSetup',
      params: { roomId: roomId.toString() },
      query: { token, livekit_host } // Pass them as query parameters
    });
  } catch (error) {
    alert(roomsStore.error || 'Не удалось присоединиться к комнате.');
  }
};

const handleCreateRoom = async () => {
  if (!newRoomName.value.trim()) {
    alert('Пожалуйста, введите название комнаты.');
    return;
  }
  try {
    const roomData = {
      name: newRoomName.value,
      is_private: newRoomIsPrivate.value,
      password: newRoomIsPrivate.value ? newRoomPassword.value : undefined,
    };
    const newRoom = await roomsStore.createRoom(roomData);
    showCreateRoomModal.value = false;
    newRoomName.value = '';
    newRoomIsPrivate.value = false;
    newRoomPassword.value = '';
    roomsStore.fetchRooms(); // Refresh room list
    router.push({ name: 'RoomSetup', params: { roomId: newRoom.id.toString() } });
  } catch (error) {
    alert(roomsStore.error || 'Не удалось создать комнату.');
  }
};
</script>
