import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const routes = [
  {
    path: '/',
    redirect: '/login', // Redirect to login by default
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginView.vue'),
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/RegisterView.vue'),
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('../views/DashboardView.vue'),
    meta: { requiresAuth: true }, // Example of a route requiring authentication
  },
  {
    path: '/room-setup/:roomId?', // Optional roomId for direct room setup
    name: 'RoomSetup',
    component: () => import('../views/RoomSetupView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/call-room/:roomId',
    name: 'CallRoom',
    component: () => import('../views/CallRoomView.vue'),
    meta: { requiresAuth: true },
  },
  // Catch all other routes and redirect to login
  {
    path: '/:catchAll(.*)',
    redirect: '/login',
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// Example of a basic navigation guard
router.beforeEach((to, _, next) => {
  const authStore = useAuthStore(); // Получаем экземпляр хранилища аутентификации
  const isAuthenticated = authStore.isAuthenticated; // Используем фактическое состояние аутентификации

  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login');
  } else {
    next();
  }
});

export default router;
