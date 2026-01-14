import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useRealtimeCallEvents } from './useRealtimeCallEvents';

export function useIncomingCallHandler() {
  const router = useRouter();
  // const roomsStore = useRoomsStore();
  const { incomingCall } = useRealtimeCallEvents(); // Получаем реактивный входящий звонок

  const showIncomingCallModal = ref(false);

  // Вычисляемые свойства для удобного доступа к деталям звонка
  const callerName = computed(() => incomingCall.value?.caller.name || null);
  const incomingRoomId = computed(() => incomingCall.value?.room.id || null);
  const incomingLivekitHost = computed(
    () => incomingCall.value?.livekit_host || null,
  );
  const incomingToken = computed(() => incomingCall.value?.token || null);
  // const incomingIsPrivate = computed(
  //   () => incomingCall.value?.room.is_private || false,
  // );

  // Отслеживаем изменение incomingCall и показываем модальное окно
  watch(incomingCall, (newCall) => {
    if (newCall) {
      showIncomingCallModal.value = true;
    } else {
      showIncomingCallModal.value = false;
    }
  });

  const acceptCall = async () => {
    if (
      !incomingRoomId.value ||
      !incomingLivekitHost.value ||
      !incomingToken.value
    ) {
      alert('Ошибка: Недостаточно данных для принятия звонка.');
      return;
    }

    try {
      // Принимаем звонок. Поскольку звонящий уже сгенерировал токен для вызываемого
      // и передал его через real-time событие, нам не нужно делать запрос joinRoom
      // для получения токена, мы уже его получили.
      // Напрямую переходим к RoomSetupView с полученными данными.
      router.push({
        name: 'RoomSetup',
        params: { roomId: incomingRoomId.value.toString() },
        query: {
          token: incomingToken.value,
          livekit_host: incomingLivekitHost.value,
          // Дополнительные параметры, если нужны (например, начальное состояние камеры/микрофона)
          cameraEnabled: 'true',
          micEnabled: 'true',
        },
      });
      // Очищаем состояние входящего звонка после принятия
      incomingCall.value = null;
      showIncomingCallModal.value = false;
    } catch (error) {
      alert('Не удалось принять звонок.');
      console.error('Ошибка при принятии звонка:', error);
    }
  };

  const declineCall = () => {
    // Просто закрываем модальное окно и очищаем состояние
    incomingCall.value = null;
    showIncomingCallModal.value = false;
    alert('Звонок отклонен.');
    // Можно добавить отправку события бэкенду об отклонении, но пока пропустим для простоты
  };

  return {
    showIncomingCallModal,
    callerName,
    acceptCall,
    declineCall,
    // Могут быть полезны для отображения в модальном окне
    incomingCallDetails: incomingCall,
  };
}
