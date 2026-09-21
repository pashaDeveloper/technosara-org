import { $fetch } from 'ofetch';

export interface ApiResponse {
  acknowledgement?: boolean;
  description?: string;
  message?: string;
}

export const api = $fetch.create({
  baseURL: '/api',
  credentials: 'same-origin',
  retry: 0,
  onResponse({ response }) {
    if (response.ok && response._data?.acknowledgement === false) {
      throw new Error(response._data.description || response._data.message || 'عملیات انجام نشد');
    }
  },
});

export function getApiErrorMessage(error: unknown): string {
  const failure = error as { data?: ApiResponse; message?: string } | null;
  return failure?.data?.description || failure?.data?.message || failure?.message || 'عملیات انجام نشد';
}
