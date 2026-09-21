import { nabApi } from '../nab';

const platformApi = nabApi.enhanceEndpoints({ addTagTypes: ['Platform'] }).injectEndpoints({
  endpoints: builder => ({
    getPlatforms: builder.query({
      query: (params) => ({ url: `/platforms`, params }),
      providesTags: (result, error) => [{ type: 'Platform', id: 'platforms' }],
    }),
    getPlatform: builder.query({
      query: ({ id }) => `/platforms/${id}`,
      providesTags: (result, error) => [{ type: 'Platform', id: 'platforms' }],
    }),
    getPlatformOptions: builder.query({
      query: () => `/platforms/all`,
      providesTags: (result, error) => [{ type: 'Platform', id: 'platforms' }],
    }),
    addPlatform: builder.mutation({
      query: (body) => ({ url: '/platforms', method: 'POST', body }),
      invalidatesTags: ['Platform'],
    }),
    reorderPlatforms: builder.mutation({
      query: (body) => ({ url: '/platforms/reorder', method: 'PATCH', body }),
      invalidatesTags: ['Platform'],
    }),
    updatePlatform: builder.mutation({
      query: ({ id, body }) => ({ url: `/platforms/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Platform'],
    }),
    deletePlatform: builder.mutation({
      query: ({ id }) => ({ url: `/platforms/${id}`, method: 'DELETE' }),
      invalidatesTags: (result, error) => result ? [{ type: 'Platform', id: 'platforms' }] : [],
    }),
  }),
});

export const { useGetPlatformQuery, useGetPlatformsQuery, useGetPlatformOptionsQuery, useAddPlatformMutation, useUpdatePlatformMutation, useDeletePlatformMutation, useReorderPlatformsMutation } = platformApi;
