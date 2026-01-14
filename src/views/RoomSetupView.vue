<template>
  <div class="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4">
    <h1 class="text-3xl font-bold mb-6">Настройка комнаты</h1>

    <div class="w-full max-w-md bg-gray-800 p-6 rounded-lg shadow-xl space-y-4">
      <!-- Video Preview -->
      <div class="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
        <video ref="localVideo" autoplay playsinline muted class="absolute inset-0 w-full h-full object-cover"></video>
        <div v-if="!cameraEnabled" class="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75">
          <span class="text-lg">Камера отключена</span>
        </div>
      </div>

      <!-- Device Selection & Controls -->
      <div class="space-y-4">
        <!-- Camera Selector -->
        <div>
          <label for="camera-select" class="block text-sm font-medium text-gray-300">Камера:</label>
          <select id="camera-select" v-model="selectedCameraId" @change="updateMediaStream"
                  class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-gray-700 text-white">
            <option v-for="device in cameraDevices" :key="device.deviceId" :value="device.deviceId">
              {{ device.label }}
            </option>
          </select>
        </div>

        <!-- Microphone Selector -->
        <div>
          <label for="mic-select" class="block text-sm font-medium text-gray-300">Микрофон:</label>
          <select id="mic-select" v-model="selectedMicId" @change="updateMediaStream"
                  class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-600 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-gray-700 text-white">
            <option v-for="device in micDevices" :key="device.deviceId" :value="device.deviceId">
              {{ device.label }}
            </option>
          </select>
        </div>

        <!-- Mute/Unmute Buttons -->
        <div class="flex justify-around pt-2">
          <button @click="toggleCamera"
                  :class="cameraEnabled ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-600 hover:bg-gray-700'"
                  class="px-4 py-2 rounded-md text-white font-medium">
            {{ cameraEnabled ? 'Отключить камеру' : 'Включить камеру' }}
          </button>
          <button @click="toggleMicrophone"
                  :class="micEnabled ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-600 hover:bg-gray-700'"
                  class="px-4 py-2 rounded-md text-white font-medium">
            {{ micEnabled ? 'Отключить микрофон' : 'Включить микрофон' }}
          </button>
        </div>
      </div>

      <!-- Join Button -->
      <div class="pt-6">
        <button @click="joinCall"
                class="w-full py-3 px-4 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-lg"
                :disabled="!roomId">
          Присоединиться к {{ roomName || 'комнате' }}
        </button>
      </div>
    </div>

    <div v-if="error" class="text-red-400 mt-4">{{ error }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  createLocalVideoTrack,
  createLocalAudioTrack,
  LocalVideoTrack,
  LocalAudioTrack
} from 'livekit-client';

const route = useRoute();
const router = useRouter();

const roomId = ref(route.params.roomId as string);
const roomName = ref(route.query.name as string || `комнате ${roomId.value}`);

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
  await requestPermissions();
  await enumerateDevices();
  await startMediaStream();
});

onUnmounted(() => {
  stopMediaStream();
});

watch([selectedCameraId, selectedMicId], () => {
  if (selectedCameraId.value || selectedMicId.value) {
    updateMediaStream();
  }
});

async function requestPermissions() {
  try {
    // Request camera and microphone permissions directly via browser API
    await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  } catch (err: any) {
    console.error('Permission denied for media devices:', err);
    error.value = 'Не удалось получить доступ к камере или микрофону. Проверьте разрешения.';
  }
}

async function enumerateDevices() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    cameraDevices.value = devices.filter(d => d.kind === 'videoinput');
    micDevices.value = devices.filter(d => d.kind === 'audioinput');

    if (cameraDevices.value.length > 0) {
      selectedCameraId.value = cameraDevices.value[0]?.deviceId || ''; // Use optional chaining
    }
    if (micDevices.value.length > 0) {
      selectedMicId.value = micDevices.value[0]?.deviceId || ''; // Use optional chaining
    }
  } catch (err: any) {
    console.error('Error enumerating devices:', err);
    error.value = 'Не удалось получить список медиаустройств.';
  }
}

async function startMediaStream() {
  stopMediaStream(); // Stop any existing stream
  try {
    currentVideoTrack = await createLocalVideoTrack({
      deviceId: selectedCameraId.value || undefined,
      // captureOptions is deprecated, LiveKit handles facingMode via deviceId or default
    });
    currentAudioTrack = await createLocalAudioTrack({
      deviceId: selectedMicId.value || undefined
    });

    if (localVideo.value && currentVideoTrack) {
      currentVideoTrack.attach(localVideo.value);
      cameraEnabled.value = true;
    } else {
      cameraEnabled.value = false;
    }
    if (currentAudioTrack) {
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
  // Restart stream with selected devices
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
  } else if (!cameraEnabled.value) {
    // If camera was off and we want to enable, try to restart stream
    startMediaStream();
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
  } else if (!micEnabled.value) {
    // If mic was off and we want to enable, try to restart stream
    startMediaStream();
  }
}

function joinCall() {
  if (!roomId.value) {
    error.value = 'ID комнаты не указан.';
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
    }
  });
}
</script>