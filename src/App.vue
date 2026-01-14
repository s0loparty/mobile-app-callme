<script setup lang="ts">
import { onMounted } from 'vue'; // Added
import { RouterView } from 'vue-router';
import IncomingCallModal from './components/IncomingCallModal.vue'; // Added
import { useIncomingCallHandler } from './composables/useIncomingCallHandler'; // Added

const { showIncomingCallModal, callerName, acceptCall, declineCall } =
  useIncomingCallHandler();
// const { startListening } = useRealtimeCallEvents();

onMounted(() => {
  // startListening(); // Start listening for incoming calls when the app mounts
});
</script>

<template>
  <div class="min-h-screen bg-gray-100">
    <RouterView />
    <IncomingCallModal
      :isVisible="showIncomingCallModal"
      :callerName="callerName"
      @accept="acceptCall"
      @decline="declineCall"
    />
  </div>
</template>

<style>
/* Базовые стили или глобальные сбросы могут быть здесь, но пока Tailwind справляется с большинством. */
</style>
