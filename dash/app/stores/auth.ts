import { ref } from 'vue';
import { defineStore } from 'pinia';
import { authApi } from '../services/auth/authApi';
import { router } from '../router';
import type { SharedPublicUser } from '../../shared/utils/permissions';

export const useAuthStore = defineStore('Auth', () => {
  const userData = ref<SharedPublicUser | null>(null);
  async function getSession(): Promise<SharedPublicUser | null> {
    try {
      const { data: user } = await authApi.getSession();
      if (user.role !== 'admin' && user.role !== 'superAdmin') return null;
      return { ...user, adminRole: user.role, username: user.email, role: user.role };
    } catch { return null; }
  }
  async function update() { userData.value = await getSession(); }
  async function logout() {
    await authApi.signOutAdmin();
    userData.value = null;
    await router.push('/login');
  }
  return { userData, getSession, update, logout };
});
