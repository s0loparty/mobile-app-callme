<template>
  <div class="min-h-screen bg-gray-900 text-white flex flex-col">
    <!-- Header -->
    <header class="bg-gray-800 p-4 flex justify-between items-center sticky top-0 z-10">
      <h1 class="text-xl font-semibold">Комната: {{ displayRoomName }}</h1>
      <button @click="disconnectRoom" class="px-3 py-1 rounded-md bg-red-500 hover:bg-red-600 text-sm">
        Выйти
      </button>
    </header>

    <!-- Main Content - Video Grid -->
    <main class="flex-1 p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-[240px_1fr]">
      <!-- Local Participant -->
      <div class="relative bg-black rounded-lg overflow-hidden flex items-center justify-center">
        <video ref="localVideoRef" autoplay playsinline muted class="w-full h-full object-cover"></video>
        <div class="absolute bottom-2 left-2 bg-gray-700 bg-opacity-75 px-2 py-1 rounded-md text-xs">Я ({{ room?.localParticipant?.name || 'Вы' }})</div>
        <div v-if="!localVideoEnabled && !isSharingScreen" class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
          <span class="text-lg">Камера выключена</span>
        </div>
        <div v-if="isSharingScreen" class="absolute top-2 right-2 bg-blue-600 bg-opacity-75 px-2 py-1 rounded-md text-xs font-semibold">
          Демонстрация экрана
        </div>
      </div>

      <!-- Remote Participants -->
      <div v-for="participant in remoteParticipants" :key="participant.sid"
           class="relative bg-black rounded-lg overflow-hidden flex items-center justify-center max-h-60">
        <video :ref="(el) => setParticipantVideoRef(participant.sid, el as HTMLVideoElement | null)" autoplay playsinline class="w-full h-full object-cover"></video>
        <div class="absolute bottom-2 left-2 bg-gray-700 bg-opacity-75 px-2 py-1 rounded-md text-xs">
          {{ participant.name || participant.identity }}
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
    <footer class="bg-gray-800 p-4 flex justify-center space-x-4 sticky bottom-0 z-10">
      <button @click="toggleLocalAudio"
              class="p-3 rounded-full text-white"
              :class="localAudioEnabled ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-gray-600 hover:bg-gray-700'">
        <Mic v-if="localAudioEnabled" :size="24" />
        <MicOff v-else :size="24" />
      </button>
      <button @click="toggleLocalVideo"
              :disabled="isSharingScreen"
              class="p-3 rounded-full text-white disabled:opacity-50 disabled:cursor-not-allowed"
              :class="localVideoEnabled ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-gray-600 hover:bg-gray-700'">
        <Video v-if="localVideoEnabled" :size="24" />
        <VideoOff v-else :size="24" />
      </button>
      <button @click="toggleScreenShare"
              class="p-3 rounded-full text-white"
              :class="isSharingScreen ? 'bg-green-500 hover:bg-green-600' : 'bg-indigo-500 hover:bg-indigo-600'">
        <ScreenShare v-if="!isSharingScreen" :size="24" />
        <ScreenShareOff v-else :size="24" />
      </button>
      <button @click="disconnectRoom" class="p-3 rounded-full bg-red-500 hover:bg-red-600 text-white">
        <PhoneOff :size="24" />
      </button>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  Room,
  RoomEvent,
  RemoteParticipant,
  RemoteTrackPublication,
  createLocalVideoTrack,
  createLocalAudioTrack,
  Track,
  RemoteTrack,
  LocalTrackPublication,
} from 'livekit-client';
import { Mic, MicOff, Video, VideoOff, PhoneOff, ScreenShare, ScreenShareOff } from 'lucide-vue-next';
import { useRoomsStore } from '../stores/rooms';

const route = useRoute();
const router = useRouter();
const roomsStore = useRoomsStore();

const roomId = route.params.roomId as string;
const localVideoRef = ref<HTMLVideoElement | null>(null);
const remoteVideoRefs = ref<{ [key: string]: HTMLVideoElement | null }>({});

const room = ref<Room | null>(null);
const localAudioEnabled = ref(true);
const localVideoEnabled = ref(true);
const isSharingScreen = ref(false);
const remoteParticipants = ref<RemoteParticipant[]>([]);

const initialVideoEnabled = route.query.cameraEnabled === 'true';
const initialAudioEnabled = route.query.micEnabled === 'true';
const initialCameraId = route.query.cameraId as string | undefined;
const initialMicId = route.query.micId as string | undefined;

const livekitHost = route.query.livekit_host as string;
const livekitToken = route.query.token as string;

const displayRoomName = computed(() => {
  const id = parseInt(roomId, 10);
  if (isNaN(id)) {
    return roomId; // Fallback for non-numeric room IDs like from 1-on-1 calls
  }
  
  const room = roomsStore.userRooms.find(r => r.id === id) || roomsStore.publicRooms.find(r => r.id === id);
  return room ? room.name : roomId;
});

onMounted(async () => {
  if (!livekitHost || !livekitToken) {
    alert('Отсутствует токен или хост LiveKit. Невозможно подключиться к комнате.');
    router.replace('/dashboard');
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
  // Check for both camera and screen share tracks
  const videoPub = participant.getTrackPublication(Track.Source.Camera) || participant.getTrackPublication(Track.Source.ScreenShare);
  return videoPub?.isSubscribed && !videoPub?.isMuted || false;
}

async function connectToRoom() {
  const livekitRoom = new Room();
  room.value = livekitRoom;

  // --- Main Room Events ---
  livekitRoom
    .on(RoomEvent.Connected, () => {
      console.log('Connected to LiveKit room:', room.value?.name);
      if (room.value) {
        remoteParticipants.value = [...room.value.remoteParticipants.values()];
        // Setup local participant event listeners
        setupLocalParticipantEvents(livekitRoom);
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
      participant.getTrackPublications().forEach(pub => pub.track?.detach().forEach(el => el.remove()));
    })
    .on(RoomEvent.TrackSubscribed, async (track: RemoteTrack, pub: RemoteTrackPublication, participant: RemoteParticipant) => {
      console.log(`Track subscribed: ${track.kind} for ${participant.identity}`);
      if (track.kind === Track.Kind.Video) {
        await nextTick();
        const videoEl = remoteVideoRefs.value[participant.sid];
        if (videoEl) {
          track.attach(videoEl);
        }
      } else if (track.kind === Track.Kind.Audio) {
        const audioEl = track.attach();
        document.body.appendChild(audioEl);
      }
    })
    .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack, pub: RemoteTrackPublication, participant: RemoteParticipant) => {
      console.log(`Track unsubscribed: ${track.kind} for ${participant.identity}`);
      track.detach().forEach(el => el.remove());
    });

  try {
    await livekitRoom.connect(`wss://${livekitHost}`, livekitToken);

    localVideoEnabled.value = initialVideoEnabled;
    localAudioEnabled.value = initialAudioEnabled;

    if (initialVideoEnabled) {
      const localVideoTrack = await createLocalVideoTrack({ deviceId: initialCameraId || undefined });
      if (localVideoRef.value) {
        localVideoTrack.attach(localVideoRef.value);
      }
      await livekitRoom.localParticipant.publishTrack(localVideoTrack, { simulcast: true });
    }

    if (initialAudioEnabled) {
      const localAudioTrack = await createLocalAudioTrack({ deviceId: initialMicId || undefined });
      await livekitRoom.localParticipant.publishTrack(localAudioTrack);
    }
  } catch (error) {
    console.error('Failed to connect to LiveKit room:', error);
    alert('Не удалось подключиться к комнате.');
    router.push('/dashboard');
  }
}

function setupLocalParticipantEvents(room: Room) {
  room.localParticipant
    .on(RoomEvent.LocalTrackPublished, (pub: LocalTrackPublication) => {
      if (pub.source === Track.Source.ScreenShare) {
        isSharingScreen.value = true;
      }
      if (pub.source === Track.Source.Camera) {
        localVideoEnabled.value = true;
      }
    })
    .on(RoomEvent.LocalTrackUnpublished, (pub: LocalTrackPublication) => {
      if (pub.source === Track.Source.ScreenShare) {
        isSharingScreen.value = false;
      }
      if (pub.source === Track.Source.Camera) {
        localVideoEnabled.value = false;
      }
    });
}


async function toggleLocalAudio() {
  if (!room.value) return;
  await room.value.localParticipant.setMicrophoneEnabled(!localAudioEnabled.value);
  localAudioEnabled.value = !localAudioEnabled.value;
}

async function toggleLocalVideo() {
  if (!room.value || isSharingScreen.value) return;
  await room.value.localParticipant.setCameraEnabled(!localVideoEnabled.value);
  localVideoEnabled.value = !localVideoEnabled.value;
}

async function toggleScreenShare() {
  if (!room.value) return;
  await room.value.localParticipant.setScreenShareEnabled(!isSharingScreen.value);
}

function disconnectRoom() {
  if (room.value) {
    room.value.disconnect();
  }
  router.push('/dashboard');
}
</script>