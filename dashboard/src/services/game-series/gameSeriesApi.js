import { nabApi } from '../nab';

const gameSeriesApi = nabApi.enhanceEndpoints({ addTagTypes: ['GameSeries'] }).injectEndpoints({
  endpoints: builder => ({
    getGameSeriesEntries: builder.query({
      query: (params) => ({ url: `/game-series`, params }),
      providesTags: (result, error) => [{ type: 'GameSeries', id: 'game-series' }],
    }),
    getGameSeries: builder.query({
      query: ({ id }) => `/game-series/${id}`,
      providesTags: (result, error) => [{ type: 'GameSeries', id: 'game-series' }],
    }),
    getGameSeriesOptions: builder.query({
      query: () => `/game-series/all`,
      providesTags: (result, error) => [{ type: 'GameSeries', id: 'game-series' }],
    }),
    reorderGameSeries: builder.mutation({
      query: (body) => ({ url: '/game-series/reorder', method: 'PATCH', body }),
      invalidatesTags: ['GameSeries'],
    }),
    addGameSeries: builder.mutation({
      query: (body) => ({ url: '/game-series', method: 'POST', body }),
      invalidatesTags: ['GameSeries'],
    }),
    updateGameSeries: builder.mutation({
      query: ({ id, body }) => ({ url: `/game-series/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['GameSeries'],
    }),
    deleteGameSeries: builder.mutation({
      query: ({ id }) => ({ url: `/game-series/${id}`, method: 'DELETE' }),
      invalidatesTags: (result, error) => result ? [{ type: 'GameSeries', id: 'game-series' }] : [],
    }),
  }),
});

export const { useGetGameSeriesQuery, useGetGameSeriesEntriesQuery, useGetGameSeriesOptionsQuery, useAddGameSeriesMutation, useUpdateGameSeriesMutation, useDeleteGameSeriesMutation, useReorderGameSeriesMutation } = gameSeriesApi;
