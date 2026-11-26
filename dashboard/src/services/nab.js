import { apiUrl } from '../utils/apiUrl.js';
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { preferStoredImages } from '../utils/cloudinaryDisplay';
import { canonicalBody, localizedNames, usesLegacyNames } from '../utils/canonicalNames';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: apiUrl(),
  credentials: 'include',
  prepareHeaders: (headers) => {
    const token = localStorage.getItem('accessToken');
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return headers;
  },
});

export const nabApi = createApi({
  reducerPath: 'nabApi',
  baseQuery: async (args, api, extraOptions) => {
    const legacy = usesLegacyNames(typeof args === 'string' ? args : args.url);
    const input = legacy && typeof args === 'object' ? { ...args, body: canonicalBody(args.body) } : args;
    const result = await rawBaseQuery(input, api, extraOptions);
    return result.data === undefined ? result : { ...result, data: preferStoredImages(legacy ? localizedNames(result.data) : result.data) };
  },
  tagTypes: [
    "User", "Setup",
    "Admin",
    "Product",
    "Brand",
    "Category",
    "Store",
    "Cart",
    "Favorite",
    "Purchase",
    "Review",
    "Tag",
    "Unit",
    "Magazine",
    "News",
    "NewsType",
    "NewsCountry",
    "Blog",
    "Gallery",
    "FeaturedProduct",
    "Payment",
    "Order",
    "Address",
    "FilterDefinition",
    "CategoryFilter",
    "ProductAttribute",
    "Session"
  ],
  endpoints: () => ({}),
});
