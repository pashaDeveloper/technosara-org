import { nabApi } from '../../services/nab';

const api = nabApi.enhanceEndpoints({ addTagTypes: ['Catalog'] }).injectEndpoints({ endpoints: builder => ({
  savedResourceStatus: builder.query({ query: id => `/games/${id}/resources`, providesTags: ['Catalog'] }),
}) });
export const { useSavedResourceStatusQuery } = api;
