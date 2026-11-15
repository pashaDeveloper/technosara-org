import { nabApi } from '../nab';

const storeApi = nabApi.enhanceEndpoints({ addTagTypes: ['Store'] }).injectEndpoints({
  endpoints: builder => ({
    getStoreCountries: builder.query({ query: () => '/stores/countries' }),
    getStores: builder.query({
      query: (params) => ({ url: `/stores`, params }),
      providesTags: (result, error) => [{ type: 'Store', id: 'stores' }],
    }),
    getStore: builder.query({
      query: ({ id }) => `/stores/${id}`,
      providesTags: (result, error) => [{ type: 'Store', id: 'stores' }],
    }),
    getStoreOptions: builder.query({
      query: () => `/stores/all`,
      providesTags: (result, error) => [{ type: 'Store', id: 'stores' }],
    }),
    reorderStore: builder.mutation({
      query: (body) => ({ url: '/stores/reorder', method: 'PATCH', body }),
      invalidatesTags: ['Store'],
    }),
    addStore: builder.mutation({
      query: (body) => ({ url: '/stores', method: 'POST', body }),
      invalidatesTags: ['Store'],
    }),
    updateStore: builder.mutation({
      query: ({ id, body }) => ({ url: `/stores/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Store'],
    }),
    deleteStore: builder.mutation({
      query: ({ id }) => ({ url: `/stores/${id}`, method: 'DELETE' }),
      invalidatesTags: (result, error) => result ? [{ type: 'Store', id: 'stores' }] : [],
    }),
  }),
});

export const { useGetStoreCountriesQuery, useGetStoreQuery, useGetStoresQuery, useGetStoreOptionsQuery, useAddStoreMutation, useUpdateStoreMutation, useDeleteStoreMutation, useReorderStoreMutation } = storeApi;
