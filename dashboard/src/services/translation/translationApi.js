import { nabApi } from "../nab";

const translationApi = nabApi.injectEndpoints({
  endpoints: (builder) => ({
    translateText: builder.mutation({
      query: (body) => ({
        url: "/translations",
        method: "POST",
        body
      })
    })
  })
});

export const { useTranslateTextMutation } = translationApi;
