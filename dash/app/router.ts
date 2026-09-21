import { createRouter, createWebHistory } from 'vue-router';
import { authApi } from './services/auth/authApi';
import { useAuthStore } from './stores/auth';

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: () => import('./pages/index.vue') },
    { path: '/me', component: () => import('./pages/me.vue') },
    { path: '/account', redirect: '/me' },
    { path: '/admin-register', redirect: '/administrators/new' },
    { path: '/administrators/new', component: () => import('./pages/administrators/new.vue') },
    { path: '/login/setup', redirect: '/setup/2' },
    { path: '/login', component: () => import('./pages/login.vue'), children: [
      { path: '', component: () => import('./pages/login/index.vue') },
    ] },
    { path: '/setup/2', component: () => import('./pages/setup/2.vue'), meta: { layout: 'setup' } },
    { path: '/setup/success', component: () => import('./pages/setup/success.vue'), meta: { layout: 'setup' } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
});

router.beforeEach(async (to) => {
  if (to.path === '/login' || to.path.startsWith('/setup')) {
    // Let the login form report upstream outages without leaving a blank page.
    try {
      const setup = await authApi.getSetup();
      if (setup.required && to.path === '/login') return '/setup/2';
      if (!setup.required && to.path.startsWith('/setup')) return '/login';
    } catch {
      if (to.path.startsWith('/setup')) return '/login';
    }
  }
  if (to.path.startsWith('/setup')) return;
  const auth = useAuthStore();
  await auth.update();
  if (to.path === '/login') return auth.userData ? '/' : undefined;
  if (!auth.userData) return { path: '/login', query: { from: to.fullPath } };
  if (to.path.startsWith('/administrators') && auth.userData.adminRole !== 'superAdmin') return '/';
});
