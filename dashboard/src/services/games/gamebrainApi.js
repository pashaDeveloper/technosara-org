import { nabApi } from '../nab';

const api = nabApi.enhanceEndpoints({ addTagTypes: ['Game'] }).injectEndpoints({
  endpoints: builder => ({
    searchGamebrain: builder.query({ query: params => ({ url: '/gamebrain/games', params }) }),
    suggestGamebrain: builder.query({ query: query => ({ url: '/games/lookup', params: { query, limit: 8 } }), providesTags: ['Game'] }),
    getGamebrainDetails: builder.query({ query: id => ({ url: `/games/lookup/${encodeURIComponent(id)}`, method: 'POST' }), providesTags: ['Game'] }),
  }),
});
export const { useLazySearchGamebrainQuery, useLazySuggestGamebrainQuery, useLazyGetGamebrainDetailsQuery } = api;
