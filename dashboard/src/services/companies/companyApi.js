import { nabApi } from '../nab';

const companyApi = nabApi.enhanceEndpoints({ addTagTypes: ['Company'] }).injectEndpoints({
  endpoints: builder => ({
    getCompanies: builder.query({
      query: (params) => ({ url: `/companies`, params }),
      providesTags: (result, error) => [{ type: 'Company', id: 'companies' }],
    }),
    getCompany: builder.query({
      query: ({ id }) => `/companies/${id}`,
      providesTags: (result, error) => [{ type: 'Company', id: 'companies' }],
    }),
    getCompanyOptions: builder.query({
      query: () => `/companies/all`,
      providesTags: (result, error) => [{ type: 'Company', id: 'companies' }],
    }),
    getCompanyCountries: builder.query({ query: () => '/companies/countries' }),
    addCompany: builder.mutation({
      query: (body) => ({ url: '/companies', method: 'POST', body }),
      invalidatesTags: ['Company'],
    }),
    updateCompany: builder.mutation({
      query: ({ id, body }) => ({ url: `/companies/${id}`, method: 'PATCH', body }),
      invalidatesTags: ['Company'],
    }),
    deleteCompany: builder.mutation({
      query: ({ id }) => ({ url: `/companies/${id}`, method: 'DELETE' }),
      invalidatesTags: (result, error) => result ? [{ type: 'Company', id: 'companies' }] : [],
    }),
  }),
});

export const { useGetCompanyQuery, useGetCompaniesQuery, useGetCompanyOptionsQuery, useGetCompanyCountriesQuery, useAddCompanyMutation, useUpdateCompanyMutation, useDeleteCompanyMutation } = companyApi;
