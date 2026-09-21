import { nabApi } from '../nab';
const api = nabApi.enhanceEndpoints({ addTagTypes: ['Platform'] }).injectEndpoints({ endpoints: b => ({
  getBrands: b.query({ query: params => ({ url: '/brands', params }), providesTags: ['Brand'] }),
  getBrand: b.query({ query: ({ id }) => `/brands/${id}`, providesTags: ['Brand'] }),
  getBrandOptions: b.query({ query: () => '/brands/all', providesTags: ['Brand'] }),
  getBrandCountries: b.query({ query: () => '/brands/countries' }),
  addBrand: b.mutation({ query: body => ({ url: '/brands', method: 'POST', body }), invalidatesTags: ['Brand'] }),
  updateBrand: b.mutation({ query: ({ id, body }) => ({ url: `/brands/${id}`, method: 'PATCH', body }), invalidatesTags: ['Brand', 'Platform'] }),
  deleteBrand: b.mutation({ query: ({ id }) => ({ url: `/brands/${id}`, method: 'DELETE' }), invalidatesTags: (result, error) => error ? [] : ['Brand'] }),
}) });
export const { useGetBrandsQuery, useGetBrandQuery, useGetBrandOptionsQuery, useGetBrandCountriesQuery, useAddBrandMutation, useUpdateBrandMutation, useDeleteBrandMutation } = api;
