import { nabApi } from '../nab';

const api = nabApi.enhanceEndpoints({ addTagTypes: ['Game'] }).injectEndpoints({
  endpoints: builder => ({
    searchGamebrain: builder.query({ query: params => ({ url: '/gamebrain/games', params }) }),
    suggestGamebrain: builder.query({ query: query => ({ url: '/games/lookup', params: { query, limit: 8 } }), providesTags: ['Game'] }),
    getGamebrainDetails: builder.query({ query: id => ({ url: `/games/lookup/${encodeURIComponent(id)}`, method: 'POST' }), providesTags: ['Game'] }),
    getGamebrainSimilar: builder.mutation({
      async queryFn({ id, ids }, _api, _options, baseQuery) {
        const url = `/gamebrain/games/${encodeURIComponent(id)}/similar`;
        const response = await baseQuery({ url, method: 'POST', body: ids ? { ids } : {} });
        if (response.error?.status !== 404 || !String(response.error.data?.description || '').startsWith('Route not found:')) {
          return response;
        }

        const legacy = await baseQuery({ url, params: { limit: 10 } });
        if (legacy.error) return legacy;
        const rows = new Map();
        for (const row of legacy.data?.data?.results || []) {
          const gameId = Number(row?.id);
          if (Number.isSafeInteger(gameId) && gameId > 0 && gameId !== id && !rows.has(gameId)) {
            rows.set(gameId, { id: gameId, title: row.name || row.title, image: row.image });
          }
        }
        return { data: { data: {
          results: (ids || [...rows.keys()]).map(gameId => rows.get(gameId) || { id: gameId }),
          legacy: true,
        } } };
      },
    }),
  }),
});
export const { useLazySearchGamebrainQuery, useLazySuggestGamebrainQuery, useLazyGetGamebrainDetailsQuery, useGetGamebrainSimilarMutation } = api;
