import { api, type ApiResponse } from '../api';
import { useMutation } from '../../composables/useMutation';

export interface SignInBody { email: string; password: string; remember?: boolean }
export interface AdminUser { id: string; name: string; email: string; role: string }

export const authApi = {
  signInAdmin: (body: SignInBody) => api<{ status: string }>('/account/login', { method: 'POST', body }),
  getSession: () => api<ApiResponse & { data: AdminUser }>('/account/me'),
  getSetup: () => api<{ required: boolean }>('/account/setup'),
  signOutAdmin: () => api<{ success: boolean }>('/account/logout', { method: 'POST' }),
};

export const useSignInAdminMutation = () => useMutation(authApi.signInAdmin);
export const useSignOutAdminMutation = () => useMutation(authApi.signOutAdmin);
