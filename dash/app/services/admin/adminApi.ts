import { api, type ApiResponse } from '../api';
import { useMutation } from '../../composables/useMutation';

export interface CreateAdminBody {
  username: string;
  password: string;
  confirmPassword: string;
  name?: string;
  avatarUrl?: string;
}

export const adminApi = {
  createAdmin: (body: CreateAdminBody) => api<ApiResponse>('/admin/users', { method: 'POST', body }),
  setupAdmin: (body: CreateAdminBody) => api<ApiResponse>('/setup/2', { method: 'POST', body }),
  registerAdmin: (body: { name: string; email: string; password: string; avatarUrl: string }) =>
    api<ApiResponse>('/account/register', { method: 'POST', body }),
};

export const useCreateAdminMutation = () => useMutation(adminApi.createAdmin);
export const useSetupAdminMutation = () => useMutation(adminApi.setupAdmin);
