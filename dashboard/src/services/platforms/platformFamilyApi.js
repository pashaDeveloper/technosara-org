import { nabApi } from '../nab';

const familyApi = nabApi.enhanceEndpoints({ addTagTypes: ['PlatformFamily'] }).injectEndpoints({
  endpoints: builder => ({
    getPlatformFamily: builder.query({ query: id => `/platform-families/${id}`, providesTags: ['PlatformFamily'] }),
    addPlatformFamily: builder.mutation({
      query: body => ({ url: '/platform-families', method: 'POST', body }),
      invalidatesTags: ['PlatformFamily'],
    }),
  }),
});

export async function loadPlatformFamilies({ search, page, limit, signal }) {
  const response = await fetch(`/api/platform-families?${new URLSearchParams({ search, page, limit })}`, { signal, credentials: 'same-origin' });
  const result = await response.json();
  if (!response.ok || result.acknowledgement === false) throw new Error(result.message);
  return { options: result.data.map(item => ({ value: item._id, label: item.name })), hasMore: result.hasMore };
}

export const { useGetPlatformFamilyQuery, useAddPlatformFamilyMutation } = familyApi;
