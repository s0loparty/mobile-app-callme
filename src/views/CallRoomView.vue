<template>
  <div class="min-h-screen bg-gray-900 text-white flex flex-col">
    <!-- Header -->
    <header class="bg-gray-800 p-4 flex justify-between items-center">
      <h1 class="text-xl font-semibold">Комната: {{ roomId }}</h1>
      <button @click="disconnectRoom" class="px-3 py-1 rounded-md bg-red-600 hover:bg-red-700 text-sm">
        Выйти
      </button>
    </header>

    <!-- Main Content - Video Grid -->
    <main class="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
      <!-- Local Participant -->
      <div class="relative bg-black rounded-lg overflow-hidden flex items-center justify-center">
        <video ref="localVideoRef" autoplay playsinline muted class="w-full h-full object-cover"></video>
        <div class="absolute bottom-2 left-2 bg-gray-700 bg-opacity-75 px-2 py-1 rounded-md text-xs">Я</div>
        <div v-if="!localVideoEnabled" class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
          <span class="text-lg">Камера выключена</span>
        </div>
      </div>

      <!-- Remote Participants -->
      <div v-for="participant in remoteParticipants" :key="participant.sid"
           class="relative bg-black rounded-lg overflow-hidden flex items-center justify-center">
        <video :ref="(el) => setParticipantVideoRef(participant.sid, el as HTMLVideoElement | null)" autoplay playsinline class="w-full h-full object-cover"></video>
        <div class="absolute bottom-2 left-2 bg-gray-700 bg-opacity-75 px-2 py-1 rounded-md text-xs">
          {{ participant.identity }}
        </div>
        <div v-if="!getParticipantVideoEnabled(participant.sid)" class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
          <span class="text-lg">Камера выключена</span>
        </div>
      </div>

      <div v-if="remoteParticipants.length === 0" class="col-span-full text-center text-gray-500 text-xl">
        Ожидание других участников...
      </div>
    </main>

    <!-- Controls -->
    <footer class="bg-gray-800 p-4 flex justify-center space-x-4">
      <button @click="toggleLocalAudio"
              :class="localAudioEnabled ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'"
              class="p-3 rounded-full text-white">
        {{ localAudioEnabled ? 'Микрофон Вкл' : 'Микрофон Выкл' }}
      </button>
      <button @click="toggleLocalVideo"
              :class="localVideoEnabled ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'"
              class="p-3 rounded-full text-white">
        {{ localVideoEnabled ? 'Камера Вкл' : 'Камера Выкл' }}
      </button>
      <button @click="disconnectRoom" class="p-3 rounded-full bg-red-600 hover:bg-red-700 text-white">
        Повесить трубку
      </button>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  Room,
  RoomEvent,
  RemoteParticipant,
  Participant,
  RemoteTrackPublication,
  createLocalVideoTrack,
  createLocalAudioTrack,
  Track,
  TrackPublication,
  LocalVideoTrack,
  LocalAudioTrack,
  RemoteTrack,
} from 'livekit-client';

const route = useRoute();
const router = useRouter();

const roomId = route.params.roomId as string;
const localVideoRef = ref<HTMLVideoElement | null>(null);
const remoteVideoRefs = ref<{ [key: string]: HTMLVideoElement | null }>({});

const room = ref<Room | null>(null);
const localAudioEnabled = ref(true);
const localVideoEnabled = ref(true);
const remoteParticipants = ref<RemoteParticipant[]>([]);

const initialVideoEnabled = route.query.cameraEnabled === 'true';
const initialAudioEnabled = route.query.micEnabled === 'true';
const initialCameraId = route.query.cameraId as string | undefined;
const initialMicId = route.query.micId as string | undefined;

// Новые: Извлечь livekit_host и token из параметров запроса маршрута
const livekitHost = route.query.livekit_host as string;
const livekitToken = route.query.token as string;

onMounted(async () => {
  // Проверить наличие токена и хоста перед подключением
  if (!livekitHost || !livekitToken) {
    alert('Отсутствует токен или хост LiveKit. Невозможно подключиться к комнате.');
    router.replace('/dashboard'); // Перенаправить на дашборд, если данные отсутствуют
    return;
  }
  await connectToRoom();
});

onUnmounted(() => {
  if (room.value) {
    room.value.disconnect();
  }
});

function setParticipantVideoRef(sid: string, el: HTMLVideoElement | null) {
  remoteVideoRefs.value[sid] = el;
}

function getParticipantVideoEnabled(sid: string): boolean {
  const participant = remoteParticipants.value.find(p => p.sid === sid);
  if (!participant) return false;
  const videoPub = participant.getTrackPublication(Track.Source.Camera);
  return videoPub?.isSubscribed && !videoPub?.isMuted || false;
}

async function connectToRoom() {
  const livekitRoom = new Room();
  room.value = livekitRoom;

  livekitRoom
    .on(RoomEvent.Connected, () => {
      console.log('Connected to LiveKit room:', room.value?.name);
      if (room.value) {
        remoteParticipants.value = [...room.value.remoteParticipants.values()];
      }
    })
    .on(RoomEvent.Disconnected, () => {
      console.log('Disconnected from LiveKit room');
      router.push('/dashboard');
    })
    .on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      console.log('Participant connected:', participant.identity);
      remoteParticipants.value.push(participant);
    })
    .on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
      console.log('Participant disconnected:', participant.identity);
      remoteParticipants.value = remoteParticipants.value.filter(p => p.sid !== participant.sid);
      // Отсоединяем все дорожки и удаляем аудио/видео элементы
      participant.getTrackPublications().forEach(pub => {
        if (pub.track) {
          pub.track.detach().forEach(el => el.remove());
        }
      });
    })
    .on(RoomEvent.TrackSubscribed, async (track: RemoteTrack, _publication: RemoteTrackPublication, participant: RemoteParticipant) => {
      console.log(`Track subscribed: ${track.kind} for ${participant.identity}`);
      if (track.kind === Track.Kind.Video) {
        await nextTick();
        const videoEl = remoteVideoRefs.value[participant.sid];
        if (videoEl) {
            track.attach(videoEl);
        }
      } else if (track.kind === Track.Kind.Audio) {
        // Явно прикрепляем и воспроизводим аудио, чтобы обеспечить работу в разных браузерах
        const audioEl = track.attach();
        document.body.appendChild(audioEl);
      }
    })
    .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, _publication: RemoteTrackPublication, participant: RemoteParticipant) => {
      console.log(`Track unsubscribed: ${track.kind} for ${participant.identity}`);
      track.detach();
    })
    .on(RoomEvent.TrackMuted, (publication: TrackPublication, participant: Participant) => {
      console.log(`Track muted: ${publication.kind} by ${participant.identity}`);
    })
    .on(RoomEvent.TrackUnmuted, (publication: TrackPublication, participant: Participant) => {
      console.log(`Track unmuted: ${publication.kind} by ${participant.identity}`);
    });

  try {
    // Использовать livekitHost и livekitToken, полученные через параметры запроса
    await livekitRoom.connect(livekitHost, livekitToken);

    localVideoEnabled.value = initialVideoEnabled;
    localAudioEnabled.value = initialAudioEnabled;

    const localVideoTrack = await createLocalVideoTrack({
      deviceId: initialCameraId || undefined,
    });
    const localAudioTrack = await createLocalAudioTrack({
      deviceId: initialMicId || undefined,
    });

    if (localVideoRef.value) {
      localVideoTrack.attach(localVideoRef.value);
    }
    await livekitRoom.localParticipant.publishTrack(localVideoTrack, { simulcast: true });
    await livekitRoom.localParticipant.publishTrack(localAudioTrack);

    if (!initialVideoEnabled) { localVideoTrack.mute(); } else { localVideoTrack.unmute(); }
    if (!initialAudioEnabled) { localAudioTrack.mute(); } else { localAudioTrack.unmute(); }


  } catch (error) {
    console.error('Failed to connect to LiveKit room:', error);
    alert('Не удалось подключиться к комнате.');
    router.push('/dashboard');
  }
}

async function toggleLocalAudio() {
  if (!room.value) return;
  const localParticipant = room.value.localParticipant;
  const audioTrackPub = localParticipant.getTrackPublication(Track.Source.Microphone);
  if (audioTrackPub?.track && audioTrackPub.track instanceof LocalAudioTrack) {
    if (localAudioEnabled.value) {
      await audioTrackPub.track.mute();
    } else {
      await audioTrackPub.track.unmute();
    }
  }
  localAudioEnabled.value = !localAudioEnabled.value;
}

async function toggleLocalVideo() {
  if (!room.value) return;
  const localParticipant = room.value.localParticipant;
  const videoTrackPub = localParticipant.getTrackPublication(Track.Source.Camera);
  if (videoTrackPub?.track && videoTrackPub.track instanceof LocalVideoTrack) {
    if (localVideoEnabled.value) {
      await videoTrackPub.track.mute();
    } else {
      await videoTrackPub.track.unmute();
    }
  }
  localVideoEnabled.value = !localVideoEnabled.value;
}

function disconnectRoom() {
  if (room.value) {
    room.value.disconnect();
  }
  router.push('/dashboard');
}
</script>