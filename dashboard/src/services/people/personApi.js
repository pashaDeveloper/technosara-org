import { nabApi } from '../nab';

const personApi = nabApi.enhanceEndpoints({ addTagTypes: ['Person'] }).injectEndpoints({
  endpoints: builder => ({
    getPeople: builder.query({ query: params => ({ url: '/people', params }), providesTags: ['Person'] }),
    getPerson: builder.query({ query: id => `/people/${id}`, providesTags: ['Person'] }),
    getPersonCountries: builder.query({ query: () => '/people/countries' }),
    getPersonOptions: builder.query({ query: () => '/people/all', providesTags: ['Person'] }),
    addPerson: builder.mutation({ query: body => ({ url: '/people', method: 'POST', body }), invalidatesTags: ['Person'] }),
    updatePerson: builder.mutation({ query: ({ id, body }) => ({ url: `/people/${id}`, method: 'PATCH', body }), invalidatesTags: ['Person'] }),
    deletePerson: builder.mutation({ query: id => ({ url: `/people/${id}`, method: 'DELETE' }), invalidatesTags: ['Person'] }),
  }),
});
export const { useGetPeopleQuery, useGetPersonQuery, useGetPersonCountriesQuery, useGetPersonOptionsQuery, useAddPersonMutation, useUpdatePersonMutation, useDeletePersonMutation } = personApi;
