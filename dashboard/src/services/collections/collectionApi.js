import { nabApi } from '../nab';

const collectionApi = nabApi.enhanceEndpoints({ addTagTypes: ['Collection'] }).injectEndpoints({
  endpoints: builder => ({
    getCollectionGameOptions: builder.query({ query: () => '/games/all' }),
    getCollections: builder.query({
      query: (params) => ({ url: `/collections`, params }),
      providesTags: (result, error) => [{ type: 'Collection', id: 'collections' }],
    }),
    getCollection: builder.query({
      query: ({ id }) => `/collections/${id}`,
      providesTags: (result, error) => [{ type: 'Collection', id: 'collections' }],
    }),
    getCollectionOptions: builder.query({
      query: () => `/collections/all`,
      providesTags: (result, error) => [{ type: 'Collection', id: 'collections' }],
    }),
    reorderCollection: builder.mutation({
      query: (body) => ({ url: '/collections/reorder', method: 'PATCH', body }),
      invalidatesTags: ['Collection'],
    }),
    addCollection: builder.mutation({
      query: (body) => ({ url: '/collections', method: 'POST', body }),
      invalidatesTags: ['Collection'],
    }),
    updateCollection: builder.mutation({
      query: ({ id, body }) => ({ url: `/collections/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Collection'],
    }),
    deleteCollection: builder.mutation({
      query: ({ id }) => ({ url: `/collections/${id}`, method: 'DELETE' }),
      invalidatesTags: (result, error) => result ? [{ type: 'Collection', id: 'collections' }] : [],
    }),
  }),
});

export const { useGetCollectionGameOptionsQuery, useGetCollectionQuery, useGetCollectionsQuery, useGetCollectionOptionsQuery, useAddCollectionMutation, useUpdateCollectionMutation, useDeleteCollectionMutation, useReorderCollectionMutation } = collectionApi;
