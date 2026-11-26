const Game = require('../models/game.model');
const gamebrain = require('./gamebrain.service');

function similarIds(values, sourceId) {
  if (!Array.isArray(values)) return [];
  return [...new Set(values.filter(id => Number.isSafeInteger(id) && id > 0 && id !== sourceId))];
}

function preview(id, row) {
  const title = [row?.name, row?.title].find(value => typeof value === 'string' && value.trim());
  if (!title) return null;
  let image;
  try {
    const url = new URL(row.image);
    if (url.protocol === 'https:' && !url.username && !url.password) image = url.href;
  } catch { /* A game can have no cover. */ }
  return { id, title: title.trim().slice(0, 300), ...(image && { image }) };
}

async function fillSimilarIds(values, previous) {
  const sourceId = Object.hasOwn(values, 'id') ? values.id : previous?.id;
  const changedSource = Boolean(previous && previous.id !== sourceId);
  if (Object.hasOwn(values, 'similar_ids')) values.similar_ids = similarIds(values.similar_ids, sourceId);
  if (!Number.isSafeInteger(sourceId) || sourceId <= 0) {
    if (changedSource) {
      values.similar_ids = [];
      values.similar_previews = [];
    }
    return;
  }
  const oldIds = similarIds(previous?.similar_ids, sourceId);
  let ids = values.similar_ids || [];
  if (changedSource && ids.length === oldIds.length && ids.every((id, index) => id === oldIds[index])) ids = [];
  if (!ids.length && !changedSource && oldIds.length) {
    delete values.similar_ids;
    ids = oldIds;
  }

  let results = [];
  if (!ids.length) {
    try {
      const response = await gamebrain.similar(String(sourceId), { limit: '10' });
      if (!Array.isArray(response?.results)) throw new Error('Invalid GameBrain recommendations');
      results = response.results;
      ids = similarIds(results.map(row => Number(row?.id)), sourceId).slice(0, 10);
      values.similar_ids = ids;
    } catch {
      // Leave the field unset so the next save can retry.
      delete values.similar_ids;
      if (changedSource) values.$unset = { similar_ids: 1, similar_previews: 1 };
      return;
    }
  }

  const saved = new Map((changedSource ? [] : previous?.similar_previews || []).map(row => [row.id, row]));
  const suggestions = new Map(results.map(row => [Number(row?.id), row]));
  const previews = await Promise.all(ids.slice(0, 10).map(async id => {
    if (saved.has(id)) return saved.get(id);
    const summary = preview(id, suggestions.get(id));
    if (summary?.image) return summary;
    try {
      const details = await gamebrain.details(String(id));
      return Number(details?.id) === id ? preview(id, details) || summary : summary;
    } catch { return summary; }
  }));
  if (previews.some(Boolean) || changedSource) {
    values.similar_previews = previews.filter(Boolean).map(({ id, title, image }) => ({ id, title, image }));
  }
}

async function catalogSimilar(game) {
  const ids = similarIds(game.similar_ids, game.id);
  if (!ids.length) return [];
  const matches = await Game.find({ id: { $in: ids }, publication_status: 'published' })
    .select('_id id title name_fa image').lean();
  const byId = new Map(matches.map(match => [match.id, match]));
  const previews = new Map((game.similar_previews || []).map(row => [row.id, row]));
  return ids.flatMap(id => {
    const local = byId.get(id);
    const cached = previews.get(id);
    if (local) return [{ ...local, ...(local.image || !cached?.image ? {} : { image: cached.image }) }];
    return cached ? [cached] : [];
  });
}

module.exports = { fillSimilarIds, catalogSimilar };
