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
    fetchGameVideoSources: builder.mutation({ query: body => ({ url: '/games/media/video-source', method: 'POST', body }) }),
    fetchGameCapabilitySources: builder.mutation({ query: body => ({ url: '/games/capabilities/source', method: 'POST', body }) }),
    getGameFeatureOptions: builder.query({ query: () => '/features/all' }),
    getGamePlatformOptions: builder.query({ query: () => '/platforms/all' }),
    getGameTagOptions: builder.query({ query: () => '/game-tags/all' }),
    localizeGameTags: builder.mutation({
      query: ids => ({ url: '/game-tags/localize', method: 'PATCH', body: { ids } }),
      async onQueryStarted(_ids, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(gameApi.util.updateQueryData('getGameTagOptions', undefined, options => {
            const translations = new Map(data.data.map(tag => [tag._id, tag.name_fa]));
            for (const option of options.data) {
              if (translations.has(option._id)) option.name_fa = translations.get(option._id);
            }
          }));
        } catch {
          // Keep existing labels if the translation service is unavailable.
        }
      },
    }),
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

export const { useFetchGameVideoSourcesMutation, useFetchGameCapabilitySourcesMutation, useGetGameCapabilityOptionsQuery, useGetGameFeatureOptionsQuery, useGetGamePlatformOptionsQuery, useGetGameTagOptionsQuery, useLocalizeGameTagsMutation, useGetGameThemeOptionsQuery, useGetGameMediaOptionsQuery, useGetGameQuery, useGetGamesQuery, useGetGameOptionsQuery, useAddGameMutation, useUpdateGameMutation, useDeleteGameMutation } = gameApi;
