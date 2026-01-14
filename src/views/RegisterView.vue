<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8 p-10 bg-white rounded-xl shadow-lg z-10">
      <div class="text-center">
        <h2 class="mt-6 text-3xl font-extrabold text-gray-900">
          Зарегистрируйтесь
        </h2>
        <p class="mt-2 text-sm text-gray-600">
          Или <router-link to="/login" class="font-medium text-indigo-600 hover:text-indigo-500">войдите в существующий аккаунт</router-link>
        </p>
      </div>
      <form class="mt-8 space-y-6" @submit.prevent="handleRegister">
        <input type="hidden" name="remember" value="true">
        <div class="rounded-md shadow-sm -space-y-px">
          <div>
            <label for="name" class="sr-only">Имя</label>
            <input id="name" name="name" type="text" autocomplete="name" required
                   class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                   placeholder="Имя" v-model="name">
          </div>
          <div>
            <label for="email-address" class="sr-only">Email адрес</label>
            <input id="email-address" name="email" type="email" autocomplete="email" required
                   class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                   placeholder="Email адрес" v-model="email">
          </div>
          <div>
            <label for="password" class="sr-only">Пароль</label>
            <input id="password" name="password" type="password" autocomplete="new-password" required
                   class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                   placeholder="Пароль" v-model="password">
          </div>
          <div>
            <label for="password-confirmation" class="sr-only">Подтверждение пароля</label>
            <input id="password-confirmation" name="password_confirmation" type="password" autocomplete="new-password" required
                   class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                   placeholder="Подтверждение пароля" v-model="password_confirmation">
          </div>
        </div>

        <div class="text-red-500 text-sm" v-if="authStore.error">{{ authStore.error }}</div>

        <div>
          <button type="submit"
                  class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  :disabled="authStore.loading">
            <span class="absolute left-0 inset-y-0 flex items-center pl-3" v-if="authStore.loading">
              <!-- Heroicon-style spinner placeholder -->
              <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </span>
            Зарегистрироваться
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

const name = ref('');
const email = ref('');
const password = ref('');
const password_confirmation = ref('');

const handleRegister = async () => {
  await authStore.register({ 
    name: name.value,
    email: email.value,
    password: password.value,
    password_confirmation: password_confirmation.value 
  });
};
</script>