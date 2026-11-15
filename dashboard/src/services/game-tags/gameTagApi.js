import { nabApi } from '../nab';

const gameTagApi = nabApi.enhanceEndpoints({ addTagTypes: ['GameTag'] }).injectEndpoints({
  endpoints: builder => ({
    getGameTagGameOptions: builder.query({ query: () => '/games/all' }),
    getGameTags: builder.query({
      query: (params) => ({ url: `/game-tags`, params }),
      providesTags: (result, error) => [{ type: 'GameTag', id: 'game-tags' }],
    }),
    getGameTag: builder.query({
      query: ({ id }) => `/game-tags/${id}`,
      providesTags: (result, error) => [{ type: 'GameTag', id: 'game-tags' }],
    }),
    getGameTagOptions: builder.query({
      query: () => `/game-tags/all`,
      providesTags: (result, error) => [{ type: 'GameTag', id: 'game-tags' }],
    }),
    reorderGameTag: builder.mutation({
      query: (body) => ({ url: '/game-tags/reorder', method: 'PATCH', body }),
      invalidatesTags: ['GameTag'],
    }),
    addGameTag: builder.mutation({
      query: (body) => ({ url: '/game-tags', method: 'POST', body }),
      invalidatesTags: ['GameTag'],
    }),
    updateGameTag: builder.mutation({
      query: ({ id, body }) => ({ url: `/game-tags/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['GameTag'],
    }),
    deleteGameTag: builder.mutation({
      query: ({ id }) => ({ url: `/game-tags/${id}`, method: 'DELETE' }),
      invalidatesTags: (result, error) => result ? [{ type: 'GameTag', id: 'game-tags' }] : [],
    }),
  }),
});

export const { useGetGameTagGameOptionsQuery, useGetGameTagQuery, useGetGameTagsQuery, useGetGameTagOptionsQuery, useAddGameTagMutation, useUpdateGameTagMutation, useDeleteGameTagMutation, useReorderGameTagMutation } = gameTagApi;
