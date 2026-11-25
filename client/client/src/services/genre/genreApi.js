import { canimApi } from "../canim";
import { imageUrl } from "@/components/games/details/gameDetailMedia";

const names = (items = []) => [...new Set(items
  .map((item) => item?.name_fa || item?.name || item?.name_en || item?.value).filter(Boolean))];

function gameCard(game) {
  return {
    ...game,
    image: imageUrl(game.image) || imageUrl(game.cover_media_id),
    summary: game.short_description,
  };
}

function consoleFamilies(values) {
  const platforms = JSON.stringify(values || []).toLowerCase();
  return [
    /xbox|x360|xb1|xsx|series [xs]/.test(platforms) && "xbox",
    /playstation|ps[345]|psvita/.test(platforms) && "playstation",
  ].filter(Boolean);
}

const genreApi = canimApi.injectEndpoints({
  endpoints: (builder) => ({
    getGenres: builder.query({
      query: () => ({ url: "/genres", params: { limit: 10 } }),
    }),
    getGames: builder.query({
      query: (filters = {}) => ({ url: "/games/storefront", params: filters }),
      transformResponse: (response) => ({ ...response, data: response.data.map(gameCard) }),
    }),
    getGame: builder.query({
      query: (id) => `/games/${encodeURIComponent(id)}/catalog`,
      transformResponse: ({ data: game }) => ({
        data: {
          ...gameCard(game),
          genreNames: names([...(game.genre_ids || []), ...(game.genres || [])]),
          developerNames: names(game.developer_ids),
          modeNames: names([...(game.game_mode_ids || []), ...(game.play_modes || [])]),
          platformNames: names([...(game.platform_ids || []), ...game.game_platforms.map((row) => row.platform_id), ...(game.platforms || [])]),
          offers: game.store_products,
          dlc: game.contents.filter(({ type }) => !["bundle", "subscription"].includes(type))
            .map((item) => ({ ...item, consoleFamilies: consoleFamilies([item.slug, item.platforms]) })),
          trophies: game.achievements.map((item) => ({
            ...item, consoleFamilies: consoleFamilies([item.platform_id, ...(item.source_platforms || [])]),
          })),
        },
      }),
    }),
    getGameFilters: builder.query({
      query: () => "/games/storefront/filters",
    }),
  }),
});

export const { useGetGenresQuery, useGetGamesQuery, useGetGameFiltersQuery, useGetGameQuery } = genreApi;
