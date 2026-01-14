<template>
  <div
    class="flex min-h-screen flex-col items-center justify-center bg-gray-900 p-4 text-white"
  >
    <h1 class="mb-6 text-3xl font-bold">Настройка комнаты</h1>

    <div class="w-full max-w-md space-y-4 rounded-lg bg-gray-800 p-6 shadow-xl">
      <!-- Video Preview -->
      <div
        class="relative aspect-video w-full overflow-hidden rounded-lg bg-black"
      >
        <video
          ref="localVideo"
          autoplay
          playsinline
          muted
          class="absolute inset-0 h-full w-full object-cover"
        ></video>
        <div
          v-if="!cameraEnabled"
          class="bg-opacity-75 absolute inset-0 flex items-center justify-center bg-gray-900"
        >
          <span class="text-lg">Камера отключена</span>
        </div>
      </div>

      <!-- Device Selection & Controls -->
      <div class="space-y-4">
        <!-- Camera Selector -->
        <div>
          <label
            for="camera-select"
            class="block text-sm font-medium text-gray-300"
            >Камера:</label
          >
          <select
            id="camera-select"
            v-model="selectedCameraId"
            @change="updateMediaStream"
            :disabled="!cameraDevices.length"
            class="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 py-2 pr-10 pl-3 text-base text-white focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-600 disabled:text-gray-400 sm:text-sm"
          >
            <option v-if="!cameraDevices.length" value="">
              Камеры не найдены
            </option>
            <option
              v-for="device in cameraDevices"
              :key="device.deviceId"
              :value="device.deviceId"
            >
              {{ device.label }}
            </option>
          </select>
        </div>

        <!-- Microphone Selector -->
        <div>
          <label
            for="mic-select"
            class="block text-sm font-medium text-gray-300"
            >Микрофон:</label
          >
          <select
            id="mic-select"
            v-model="selectedMicId"
            @change="updateMediaStream"
            :disabled="!micDevices.length"
            class="mt-1 block w-full rounded-md border-gray-600 bg-gray-700 py-2 pr-10 pl-3 text-base text-white focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none disabled:bg-gray-600 disabled:text-gray-400 sm:text-sm"
          >
            <option v-if="!micDevices.length" value="">
              Микрофоны не найдены
            </option>
            <option
              v-for="device in micDevices"
              :key="device.deviceId"
              :value="device.deviceId"
            >
              {{ device.label }}
            </option>
          </select>
        </div>

        <!-- Mute/Unmute Buttons -->
        <div class="flex justify-around pt-2">
          <button
            @click="toggleCamera"
            :disabled="!cameraDevices.length"
            class="rounded-md px-4 py-2 font-medium disabled:cursor-not-allowed disabled:opacity-50"
            :class="
              cameraEnabled
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-gray-600 hover:bg-gray-700'
            "
          >
            {{ cameraEnabled ? 'Отключить камеру' : 'Включить камеру' }}
          </button>
          <button
            @click="toggleMicrophone"
            :disabled="!micDevices.length"
            class="rounded-md px-4 py-2 font-medium disabled:cursor-not-allowed disabled:opacity-50"
            :class="
              micEnabled
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-gray-600 hover:bg-gray-700'
            "
          >
            {{ micEnabled ? 'Отключить микрофон' : 'Включить микрофон' }}
          </button>
        </div>
      </div>

      <!-- Join Button -->
      <div class="pt-6">
        <button
          @click="joinCall"
          class="w-full rounded-md bg-indigo-600 px-4 py-3 text-lg font-bold text-white hover:bg-indigo-700"
          :disabled="!roomId"
        >
          Присоединиться к {{ roomName || 'комнате' }}
        </button>
      </div>
    </div>

    <div v-if="error" class="mt-4 text-yellow-400">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import {
  createLocalAudioTrack,
  createLocalVideoTrack,
  LocalAudioTrack,
  LocalVideoTrack,
} from 'livekit-client';
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

const roomId = ref(route.params.roomId as string);
const roomName = ref((route.query.name as string) || `комнате ${roomId.value}`);

const livekitHost = route.query.livekit_host as string;
const livekitToken = route.query.token as string;

const localVideo = ref<HTMLVideoElement | null>(null);
const cameraDevices = ref<MediaDeviceInfo[]>([]);
const micDevices = ref<MediaDeviceInfo[]>([]);
const selectedCameraId = ref<string>('');
const selectedMicId = ref<string>('');
const cameraEnabled = ref(true);
const micEnabled = ref(true);
const error = ref<string | null>(null);

let currentVideoTrack: LocalVideoTrack | null = null;
let currentAudioTrack: LocalAudioTrack | null = null;

onMounted(async () => {
  // Add devicechange listener
  navigator.mediaDevices.addEventListener('devicechange', enumerateDevices);

  if (!livekitHost || !livekitToken) {
    error.value =
      'Не удалось получить данные для подключения к LiveKit. Попробуйте еще раз.';
    router.replace('/dashboard');
    return;
  }
  await requestPermissions();
  await enumerateDevices();
  await startMediaStream();
});

onUnmounted(() => {
  // Remove devicechange listener
  navigator.mediaDevices.removeEventListener('devicechange', enumerateDevices);
  stopMediaStream();
});

watch([selectedCameraId, selectedMicId], () => {
  if (selectedCameraId.value || selectedMicId.value) {
    updateMediaStream();
  }
});

async function requestPermissions() {
  try {
    // This will trigger the native permission prompt if permissions are not already granted.
    // We use an empty catch block because not having devices is not a fatal error for joining.
    await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  } catch (err: any) {
    console.warn('Could not get media stream for permissions check:', err);
    error.value =
      'Не удалось получить доступ к камере или микрофону. Вы можете присоединиться без них.';
  }
}

async function enumerateDevices() {
  try {
    // Stop any existing stream before enumerating, to get fresh device labels
    stopMediaStream();
    const devices = await navigator.mediaDevices.enumerateDevices();

    cameraDevices.value = devices.filter((d) => d.kind === 'videoinput');
    micDevices.value = devices.filter((d) => d.kind === 'audioinput');

    if (cameraDevices.value.length > 0 && !selectedCameraId.value) {
      selectedCameraId.value = cameraDevices.value[0]?.deviceId || '';
    }
    if (micDevices.value.length > 0 && !selectedMicId.value) {
      selectedMicId.value = micDevices.value[0]?.deviceId || '';
    }

    // After enumerating, restart the media stream with the selected (or default) devices
    await startMediaStream();
  } catch (err: any) {
    console.error('Error enumerating devices:', err);
    error.value = 'Не удалось получить список медиаустройств.';
  }
}

async function startMediaStream() {
  stopMediaStream();

  try {
    if (cameraDevices.value.length > 0) {
      currentVideoTrack = await createLocalVideoTrack({
        deviceId: selectedCameraId.value || undefined,
      });
      if (localVideo.value) {
        currentVideoTrack.attach(localVideo.value);
      }
      cameraEnabled.value = true;
    } else {
      cameraEnabled.value = false;
    }

    if (micDevices.value.length > 0) {
      currentAudioTrack = await createLocalAudioTrack({
        deviceId: selectedMicId.value || undefined,
      });
      micEnabled.value = true;
    } else {
      micEnabled.value = false;
    }
  } catch (err: any) {
    console.error('Error starting media stream:', err);
    error.value = 'Не удалось запустить видео или аудио поток.';
    cameraEnabled.value = false;
    micEnabled.value = false;
  }
}

async function updateMediaStream() {
  await startMediaStream();
}

function stopMediaStream() {
  if (currentVideoTrack) {
    currentVideoTrack.stop();
    currentVideoTrack.detach();
    currentVideoTrack = null;
  }
  if (currentAudioTrack) {
    currentAudioTrack.stop();
    currentAudioTrack.detach();
    currentAudioTrack = null;
  }
}

function toggleCamera() {
  if (currentVideoTrack) {
    if (cameraEnabled.value) {
      currentVideoTrack.mute();
    } else {
      currentVideoTrack.unmute();
    }
    cameraEnabled.value = !cameraEnabled.value;
  }
}

function toggleMicrophone() {
  if (currentAudioTrack) {
    if (micEnabled.value) {
      currentAudioTrack.mute();
    } else {
      currentAudioTrack.unmute();
    }
    micEnabled.value = !micEnabled.value;
  }
}

function joinCall() {
  if (!roomId.value) {
    error.value = 'ID комнаты не указан.';
    return;
  }
  if (!livekitHost || !livekitToken) {
    error.value =
      'Отсутствует токен или хост LiveKit. Невозможно присоединиться.';
    return;
  }

  router.push({
    name: 'CallRoom',
    params: { roomId: roomId.value },
    query: {
      cameraEnabled: cameraEnabled.value.toString(),
      micEnabled: micEnabled.value.toString(),
      cameraId: selectedCameraId.value,
      micId: selectedMicId.value,
      livekit_host: livekitHost,
      token: livekitToken,
    },
  });
}
</script>
