import { useEcho } from '@laravel/echo-vue';
import { onMounted, onUnmounted, ref } from 'vue';
import { useAuthStore } from '../stores/auth';

// Определяем интерфейс для данных входящего звонка, которые приходят с бэкенда
interface IncomingCallPayload {
  caller: {
    id: number;
    name: string;
    // ... другие детали звонящего
  };
  room: {
    id: number;
    name: string;
    is_private: boolean;
    // ... другие детали комнаты
  };
  livekit_host: string;
  token: string;
}
interface CallIncomingData {
  room: {
    id: number;
    name: string;
    slug: string;
  };
  caller: {
    id: number;
    name: string;
  };
}

export function useRealtimeCallEvents() {
  const authStore = useAuthStore();
  const incomingCall = ref<IncomingCallPayload | null>(null);

  // let channel: ReturnType<typeof window.Echo.private> | null = null;
  const channel = useEcho(
    `App.Models.User.${authStore.user?.id}`,
    'call.incoming',
    (data: CallIncomingData) => {
      console.log('call.incoming data', data);

      if (!authStore.user?.id) {
        console.warn('Пользователь не авторизован для прослушивания звонков.');
        return;
      }

      // incomingCall.value = data;
    },
  );

  channel.listen();

  // const startListening = () => {
  //   if (!authStore.user?.id || typeof window.Echo === 'undefined') {
  //     console.warn(
  //       'Echo не настроен или пользователь не авторизован для прослушивания звонков.',
  //     );
  //     return;
  //   }

  //   const userId = authStore.user.id;
  //   const channelName = `private-App.Models.User.${userId}`; // Имя приватного канала, как определено на бэкенде

  //   console.log(`Подписка на канал: ${channelName}`);

  //   channel = window.Echo.private(channelName).listen(
  //     'IncomingCall',
  //     (e: IncomingCallPayload) => {
  //       // 'IncomingCall' - имя класса события на бэкенде
  //       console.log('Получен входящий звонок:', e);
  //       incomingCall.value = e;
  //     },
  //   );
  // };

  // const stopListening = () => {
  //   if (channel) {
  //     const userId = authStore.user?.id;
  //     const channelName = `private-App.Models.User.${userId}`;
  //     console.log(`Отписка от канала: ${channelName}`);
  //     window.Echo.leave(channelName);
  //     channel = null;
  //   }
  // };

  // onMounted и onUnmounted будут вызываться в компоненте, который использует этот composable
  // Если композабл используется глобально (например, в App.vue), то слушатель будет активен
  // все время, пока App.vue активен.
  onMounted(() => {
    // Можно добавить задержку, чтобы Echo успел инициализироваться
    setTimeout(() => {
      // startListening();
    }, 1000);
  });

  onUnmounted(() => {
    // stopListening();
  });

  return {
    incomingCall,
    // startListening,
    // stopListening,
  };
}
