import { nabApi } from '../nab';

const authApi = nabApi.injectEndpoints({
  endpoints: (builder) => ({
    submitVerification: builder.mutation({
      query: (body) => ({ url: '/account/verification', method: 'POST', body }),
      invalidatesTags: ['User', 'Admin'],
    }),
    verificationRequests: builder.query({
      query: () => '/admin/verification',
      providesTags: ['Admin'],
    }),
    reviewVerification: builder.mutation({
      query: (body) => ({ url: '/admin/verification', method: 'PATCH', body }),
      invalidatesTags: ['User', 'Admin'],
    }),
    updateProfile: builder.mutation({
      query: (body) => ({ url: '/admin/account/me', method: 'PATCH', body }),
      invalidatesTags: ['User', 'Admin'],
    }),
    signUp: builder.mutation({
      query: (body) => ({ url: '/admin/account/register', method: 'POST', body }),
      invalidatesTags: ['Setup'],
    }),
    signIn: builder.mutation({
      async queryFn(body, api, options, baseQuery) {
        const result = await baseQuery({ url: '/admin/account/login', method: 'POST', body });
        if (result.error) return result;
        const token = result.data?.token || result.data?.accessToken;
        if (!token) return { error: { status: 'CUSTOM_ERROR', error: 'Login response is missing a token' } };
        localStorage.setItem('accessToken', token);
        return { data: { ...result.data, status: 'success' } };
      },
      invalidatesTags: ['User'],
    }),
    persistLogin: builder.query({
      query: () => '/admin/account/me',
      providesTags: ['User'],
    }),
    setup: builder.query({
      query: () => '/admin/account/setup',
      providesTags: ['Setup'],
    }),
    signOut: builder.mutation({
      query: () => ({ url: '/admin/account/logout', method: 'POST' }),
    }),
  }),
});

export const { useSubmitVerificationMutation, useVerificationRequestsQuery, useReviewVerificationMutation, useUpdateProfileMutation, useSignUpMutation, useSignInMutation, usePersistLoginQuery, useSetupQuery, useSignOutMutation } = authApi;
