import { nabApi } from '../nab';

const gameApi = nabApi.enhanceEndpoints({ addTagTypes: ['Game'] }).injectEndpoints({
  endpoints: builder => ({
    getGames: builder.query({
      query: (params) => ({ url: `/games`, params }),
      providesTags: (result, error) => [{ type: 'Game', id: 'games' }],
    }),
    getGame: builder.query({
      query: ({ id }) => `/games/${id}`,
      providesTags: (result, error) => [{ type: 'Game', id: 'games' }],
    }),
    getGameOptions: builder.query({
      query: () => `/games/all`,
      providesTags: (result, error) => [{ type: 'Game', id: 'games' }],
    }),
    getGameThemeOptions: builder.query({ query: () => '/themes/all' }),
    getGameCapabilityOptions: builder.query({ query: () => '/games/capabilities' }),
    fetchGameCapabilitySources: builder.mutation({ query: body => ({ url: '/games/capabilities/source', method: 'POST', body }) }),
    getGameFeatureOptions: builder.query({ query: () => '/features/all' }),
    getGamePlatformOptions: builder.query({ query: () => '/platforms/all' }),
    getGameTagOptions: builder.query({ query: () => '/game-tags/all' }),
    getGameMediaOptions: builder.query({ query: () => '/media/all' }),
    addGame: builder.mutation({
      query: (body) => ({ url: '/games', method: 'POST', body }),
      invalidatesTags: ['Game'],
    }),
    updateGame: builder.mutation({
      query: ({ id, body }) => ({ url: `/games/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Game'],
    }),
    deleteGame: builder.mutation({
      query: ({ id }) => ({ url: `/games/${id}`, method: 'DELETE' }),
      invalidatesTags: (result, error) => result ? [{ type: 'Game', id: 'games' }] : [],
    }),
  }),
});

export const { useFetchGameCapabilitySourcesMutation, useGetGameCapabilityOptionsQuery, useGetGameFeatureOptionsQuery, useGetGamePlatformOptionsQuery, useGetGameTagOptionsQuery, useGetGameThemeOptionsQuery, useGetGameMediaOptionsQuery, useGetGameQuery, useGetGamesQuery, useGetGameOptionsQuery, useAddGameMutation, useUpdateGameMutation, useDeleteGameMutation } = gameApi;
