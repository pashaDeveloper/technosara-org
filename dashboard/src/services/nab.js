import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const nabApi = createApi({
  reducerPath: 'nabApi',
  baseQuery: fetchBaseQuery({
    baseUrl: '/api',
    credentials: 'same-origin',
    prepareHeaders: (headers) => {
      const token = localStorage.getItem('accessToken');
      if (token) headers.set('Authorization', `Bearer ${token}`);
      return headers;
    },
  }),
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
