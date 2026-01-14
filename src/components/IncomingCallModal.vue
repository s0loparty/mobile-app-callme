<template>
  <Transition
    enter-active-class="transition ease-out duration-300 transform"
    enter-from-class="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
    enter-to-class="opacity-100 translate-y-0 sm:scale-100"
    leave-active-class="transition ease-in duration-200 transform"
    leave-from-class="opacity-100 translate-y-0 sm:scale-100"
    leave-to-class="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
  >
    <div
      v-if="isVisible"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4"
    >
      <div
        class="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800"
      >
        <div class="text-center">
          <PhoneCallIcon
            class="mx-auto size-12 text-indigo-500 dark:text-indigo-400"
          />
          <h3
            class="mt-4 text-xl font-semibold text-gray-900 dark:text-white"
          >
            Входящий звонок
          </h3>
          <p class="mt-2 text-gray-600 dark:text-gray-400">
            {{ callerName }} вам звонит!
          </p>
        </div>
        <div class="mt-6 flex justify-center space-x-4">
          <button
            @click="$emit('accept')"
            class="inline-flex items-center rounded-md bg-green-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            <PhoneIcon class="mr-2 size-5" /> Принять
          </button>
          <button
            @click="$emit('decline')"
            class="inline-flex items-center rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            <PhoneOffIcon class="mr-2 size-5" /> Отклонить
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { PhoneCallIcon, PhoneIcon, PhoneOffIcon } from 'lucide-vue-next';

defineProps<{
  isVisible: boolean;
  callerName: string | null;
}>();

defineEmits(['accept', 'decline']);
</script>
