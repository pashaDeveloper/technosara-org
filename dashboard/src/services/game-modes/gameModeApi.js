import { nabApi } from '../nab';

const gameModeApi = nabApi.enhanceEndpoints({ addTagTypes: ['GameMode'] }).injectEndpoints({
  endpoints: builder => ({
    getGameModes: builder.query({
      query: (params) => ({ url: `/game-modes`, params }),
      providesTags: (result, error) => [{ type: 'GameMode', id: 'game-modes' }],
    }),
    getGameMode: builder.query({
      query: ({ id }) => `/game-modes/${id}`,
      providesTags: (result, error) => [{ type: 'GameMode', id: 'game-modes' }],
    }),
    getGameModeOptions: builder.query({
      query: () => `/game-modes/all`,
      providesTags: (result, error) => [{ type: 'GameMode', id: 'game-modes' }],
    }),
    reorderGameMode: builder.mutation({
      query: (body) => ({ url: '/game-modes/reorder', method: 'PATCH', body }),
      invalidatesTags: ['GameMode'],
    }),
    addGameMode: builder.mutation({
      query: (body) => ({ url: '/game-modes', method: 'POST', body }),
      invalidatesTags: ['GameMode'],
    }),
    updateGameMode: builder.mutation({
      query: ({ id, body }) => ({ url: `/game-modes/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['GameMode'],
    }),
    deleteGameMode: builder.mutation({
      query: ({ id }) => ({ url: `/game-modes/${id}`, method: 'DELETE' }),
      invalidatesTags: (result, error) => result ? [{ type: 'GameMode', id: 'game-modes' }] : [],
    }),
  }),
});

export const { useGetGameModeQuery, useGetGameModesQuery, useGetGameModeOptionsQuery, useAddGameModeMutation, useUpdateGameModeMutation, useDeleteGameModeMutation, useReorderGameModeMutation } = gameModeApi;
