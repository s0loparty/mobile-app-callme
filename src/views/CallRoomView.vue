<template>
  <div class="flex min-h-screen flex-col bg-gray-900 text-white">
    <!-- Header -->
    <header
      class="sticky top-0 z-10 flex items-center justify-between bg-gray-800 p-4"
    >
      <h1 class="text-xl font-semibold">Комната: {{ displayRoomName }}</h1>
      <button
        @click="disconnectRoom"
        class="rounded-md bg-red-500 px-3 py-1 text-sm hover:bg-red-600"
      >
        Выйти
      </button>
    </header>

    <!-- Main Content - Video Grid -->
    <main
      class="grid flex-1 auto-rows-[240px_1fr] grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-3"
    >
      <!-- Local Participant -->
      <div
        class="relative flex items-center justify-center overflow-hidden rounded-lg bg-black"
      >
        <video
          ref="localVideoRef"
          autoplay
          playsinline
          muted
          class="h-full w-full object-cover"
        ></video>
        <div
          class="bg-opacity-75 absolute bottom-2 left-2 rounded-md bg-gray-700 px-2 py-1 text-xs"
        >
          Я ({{ room?.localParticipant?.name || 'Вы' }})
        </div>
        <div
          v-if="!localVideoEnabled && !isSharingScreen"
          class="bg-opacity-75 absolute inset-0 flex items-center justify-center bg-black"
        >
          <span class="text-lg">Камера выключена</span>
        </div>
        <div
          v-if="isSharingScreen"
          class="bg-opacity-75 absolute top-2 right-2 rounded-md bg-blue-600 px-2 py-1 text-xs font-semibold"
        >
          Демонстрация экрана
        </div>
      </div>

      <!-- Remote Participants -->
      <div
        v-for="participant in remoteParticipants"
        :key="participant.sid"
        class="relative flex max-h-60 items-center justify-center overflow-hidden rounded-lg bg-black"
      >
        <video
          :ref="
            (el) =>
              setParticipantVideoRef(
                participant.sid,
                el as HTMLVideoElement | null,
              )
          "
          autoplay
          playsinline
          class="h-full w-full object-cover"
        ></video>
        <div
          class="bg-opacity-75 absolute bottom-2 left-2 rounded-md bg-gray-700 px-2 py-1 text-xs"
        >
          {{ participant.name || participant.identity }}
        </div>
        <div
          v-if="!getParticipantVideoEnabled(participant.sid)"
          class="bg-opacity-75 absolute inset-0 flex items-center justify-center bg-black"
        >
          <span class="text-lg">Камера выключена</span>
        </div>
      </div>

      <div
        v-if="remoteParticipants.length === 0"
        class="col-span-full text-center text-xl text-gray-500"
      >
        Ожидание других участников...
      </div>
    </main>

    <!-- Controls -->
    <footer
      class="sticky bottom-0 z-10 flex justify-center space-x-4 bg-gray-800 p-4"
    >
      <button
        @click="toggleLocalAudio"
        class="rounded-full p-3 text-white"
        :class="
          localAudioEnabled
            ? 'bg-indigo-500 hover:bg-indigo-600'
            : 'bg-gray-600 hover:bg-gray-700'
        "
      >
        <Mic v-if="localAudioEnabled" :size="24" />
        <MicOff v-else :size="24" />
      </button>
      <button
        @click="toggleLocalVideo"
        :disabled="isSharingScreen"
        class="rounded-full p-3 text-white disabled:cursor-not-allowed disabled:opacity-50"
        :class="
          localVideoEnabled
            ? 'bg-indigo-500 hover:bg-indigo-600'
            : 'bg-gray-600 hover:bg-gray-700'
        "
      >
        <Video v-if="localVideoEnabled" :size="24" />
        <VideoOff v-else :size="24" />
      </button>
      <button
        @click="toggleScreenShare"
        class="rounded-full p-3 text-white"
        :class="
          isSharingScreen
            ? 'bg-green-500 hover:bg-green-600'
            : 'bg-indigo-500 hover:bg-indigo-600'
        "
      >
        <ScreenShare v-if="!isSharingScreen" :size="24" />
        <ScreenShareOff v-else :size="24" />
      </button>
      <button
        @click="disconnectRoom"
        class="rounded-full bg-red-500 p-3 text-white hover:bg-red-600"
      >
        <PhoneOff :size="24" />
      </button>
    </footer>
  </div>
</template>

<script setup lang="ts">
import {
  createLocalAudioTrack,
  createLocalVideoTrack,
  LocalTrackPublication,
  RemoteParticipant,
  RemoteTrack,
  RemoteTrackPublication,
  Room,
  RoomEvent,
  Track,
} from 'livekit-client';
import {
  Mic,
  MicOff,
  PhoneOff,
  ScreenShare,
  ScreenShareOff,
  Video,
  VideoOff,
} from 'lucide-vue-next';
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
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

  const room =
    roomsStore.userRooms.find((r) => r.id === id) ||
    roomsStore.publicRooms.find((r) => r.id === id);
  return room ? room.name : roomId;
});

onMounted(async () => {
  if (!livekitHost || !livekitToken) {
    alert(
      'Отсутствует токен или хост LiveKit. Невозможно подключиться к комнате.',
    );
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
  const participant = remoteParticipants.value.find((p) => p.sid === sid);
  if (!participant) return false;
  // Check for both camera and screen share tracks
  const videoPub =
    participant.getTrackPublication(Track.Source.Camera) ||
    participant.getTrackPublication(Track.Source.ScreenShare);
  return (videoPub?.isSubscribed && !videoPub?.isMuted) || false;
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
      remoteParticipants.value = remoteParticipants.value.filter(
        (p) => p.sid !== participant.sid,
      );
      participant
        .getTrackPublications()
        .forEach((pub) => pub.track?.detach().forEach((el) => el.remove()));
    })
    .on(
      RoomEvent.TrackSubscribed,
      async (
        track: RemoteTrack,
        pub: RemoteTrackPublication,
        participant: RemoteParticipant,
      ) => {
        console.log(
          `Track subscribed: ${track.kind} for ${participant.identity}`,
        );
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
      },
    )
    .on(
      RoomEvent.TrackUnsubscribed,
      (
        track: RemoteTrack,
        pub: RemoteTrackPublication,
        participant: RemoteParticipant,
      ) => {
        console.log(
          `Track unsubscribed: ${track.kind} for ${participant.identity}`,
        );
        track.detach().forEach((el) => el.remove());
      },
    );

  try {
    await livekitRoom.connect(`wss://${livekitHost}`, livekitToken);

    localVideoEnabled.value = initialVideoEnabled;
    localAudioEnabled.value = initialAudioEnabled;

    if (initialVideoEnabled) {
      const localVideoTrack = await createLocalVideoTrack({
        deviceId: initialCameraId || undefined,
      });
      if (localVideoRef.value) {
        localVideoTrack.attach(localVideoRef.value);
      }
      await livekitRoom.localParticipant.publishTrack(localVideoTrack, {
        simulcast: true,
      });
    }

    if (initialAudioEnabled) {
      const localAudioTrack = await createLocalAudioTrack({
        deviceId: initialMicId || undefined,
      });
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
  await room.value.localParticipant.setMicrophoneEnabled(
    !localAudioEnabled.value,
  );
  localAudioEnabled.value = !localAudioEnabled.value;
}

async function toggleLocalVideo() {
  if (!room.value || isSharingScreen.value) return;
  await room.value.localParticipant.setCameraEnabled(!localVideoEnabled.value);
  localVideoEnabled.value = !localVideoEnabled.value;
}

async function toggleScreenShare() {
  if (!room.value) return;
  await room.value.localParticipant.setScreenShareEnabled(
    !isSharingScreen.value,
  );
}

function disconnectRoom() {
  if (room.value) {
    room.value.disconnect();
  }
  router.push('/dashboard');
}
</script>
