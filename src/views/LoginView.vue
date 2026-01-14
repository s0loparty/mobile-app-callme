<template>
  <div
    class="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8"
  >
    <div
      class="z-10 w-full max-w-md space-y-8 rounded-xl bg-white p-10 shadow-lg"
    >
      <div class="text-center">
        <h2 class="mt-6 text-3xl font-extrabold text-gray-900">
          Войдите в свой аккаунт
        </h2>
        <p class="mt-2 text-sm text-gray-600">
          Или
          <router-link
            to="/register"
            class="font-medium text-indigo-600 hover:text-indigo-500"
            >создайте новый аккаунт</router-link
          >
        </p>
      </div>
      <form class="mt-8 space-y-6" @submit.prevent="handleLogin">
        <input type="hidden" name="remember" value="true" />
        <div class="-space-y-px rounded-md shadow-sm">
          <div>
            <label for="email-address" class="sr-only">Email адрес</label>
            <input
              id="email-address"
              name="email"
              type="email"
              autocomplete="email"
              required
              class="relative block w-full appearance-none rounded-none rounded-t-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none sm:text-sm"
              placeholder="Email адрес"
              v-model="email"
            />
          </div>
          <div>
            <label for="password" class="sr-only">Пароль</label>
            <input
              id="password"
              name="password"
              type="password"
              autocomplete="current-password"
              required
              class="relative block w-full appearance-none rounded-none rounded-b-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-indigo-500 focus:ring-indigo-500 focus:outline-none sm:text-sm"
              placeholder="Пароль"
              v-model="password"
            />
          </div>
        </div>

        <div class="text-sm text-red-500" v-if="authStore.error">
          {{ authStore.error }}
        </div>

        <div>
          <button
            type="submit"
            class="group relative flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
            :disabled="authStore.loading"
          >
            <span
              class="absolute inset-y-0 left-0 flex items-center pl-3"
              v-if="authStore.loading"
            >
              <!-- Heroicon-style spinner placeholder -->
              <svg
                class="mr-3 -ml-1 h-5 w-5 animate-spin text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                ></circle>
                <path
                  class="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            </span>
            Войти
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();

const email = ref('');
const password = ref('');

const handleLogin = async () => {
  await authStore.login({ email: email.value, password: password.value });
};
</script>
