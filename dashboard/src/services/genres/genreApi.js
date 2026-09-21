import { nabApi } from '../nab';

const genreApi = nabApi.enhanceEndpoints({ addTagTypes: ['Genre'] }).injectEndpoints({
  endpoints: builder => ({
    getGenres: builder.query({
      query: (params) => ({ url: `/genres`, params }),
      providesTags: (result, error) => [{ type: 'Genre', id: 'genres' }],
    }),
    getGenre: builder.query({
      query: ({ id }) => `/genres/${id}`,
      providesTags: (result, error) => [{ type: 'Genre', id: 'genres' }],
    }),
    getGenreOptions: builder.query({
      query: () => `/genres/all`,
      providesTags: (result, error) => [{ type: 'Genre', id: 'genres' }],
    }),
    reorderGenre: builder.mutation({
      query: (body) => ({ url: '/genres/reorder', method: 'PATCH', body }),
      invalidatesTags: ['Genre'],
    }),
    addGenre: builder.mutation({
      query: (body) => ({ url: '/genres', method: 'POST', body }),
      invalidatesTags: ['Genre'],
    }),
    updateGenre: builder.mutation({
      query: ({ id, body }) => ({ url: `/genres/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Genre'],
    }),
    deleteGenre: builder.mutation({
      query: ({ id }) => ({ url: `/genres/${id}`, method: 'DELETE' }),
      invalidatesTags: (result, error) => result ? [{ type: 'Genre', id: 'genres' }] : [],
    }),
  }),
});

export const { useGetGenreQuery, useGetGenresQuery, useGetGenreOptionsQuery, useAddGenreMutation, useUpdateGenreMutation, useDeleteGenreMutation, useReorderGenreMutation } = genreApi;
