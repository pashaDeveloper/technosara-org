const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const BASE = 'https://api.gamebrain.co/v1';

function parameters(input, allowed, maxLimit = 50) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    if (!allowed.includes(key) || typeof value !== 'string' || value.length > 16000) throw fail(`Invalid GameBrain parameter: ${key}`);
    if (['offset', 'limit'].includes(key) && !/^\d+$/.test(value)) throw fail(`Invalid GameBrain parameter: ${key}`);
    if (key === 'offset' && Number(value) > 1000) throw fail('Invalid GameBrain offset');
    if (key === 'limit' && (Number(value) < 1 || Number(value) > maxLimit)) throw fail('Invalid GameBrain limit');
    if (key === 'sort' && !['computed_rating', 'release_date', 'price'].includes(value)) throw fail('Invalid GameBrain sort');
    if (key === 'sort-order' && !['asc', 'desc'].includes(value)) throw fail('Invalid GameBrain sort order');
    if (key === 'generate-filter-options' && !['true', 'false'].includes(value)) throw fail('Invalid GameBrain filter option');
    if (key === 'filters') {
      let filters;
      try { filters = JSON.parse(value); } catch { throw fail('Invalid GameBrain filters'); }
      if (!Array.isArray(filters)) throw fail('Invalid GameBrain filters');
    }
    params.set(key, value);
  }
  return params;
}
function gameId(id) {
  if (typeof id !== 'string' || !/^\d{1,15}$/.test(id) || Number(id) < 1) throw fail('Invalid GameBrain game ID');
  return id;
}
let requestQueue = Promise.resolve();
function request(path, params = new URLSearchParams()) {
  const result = requestQueue.then(() => performRequest(path, params));
  requestQueue = result.catch(() => {});
  return result;
}
async function performRequest(path, params) {
  const key = process.env.GAMEBRAIN_API_KEY;
  if (!key) throw fail('Configure GAMEBRAIN_API_KEY in the server environment', 503);
  const url = new URL(BASE + path);
  url.search = params.toString();
  let response;
  try {
    response = await fetch(url, {
      headers: { Accept: 'application/json', 'x-api-key': key },
      signal: AbortSignal.timeout(20000), redirect: 'error',
    });
  } catch { throw fail('GameBrain request unavailable or timed out', 502); }
  if (!response.ok) throw fail(`GameBrain HTTP ${response.status}`, [402, 404, 429].includes(response.status) ? response.status : 502);
  try {
    const chunks = []; let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > 8 * 1024 * 1024) throw new Error('Response too large');
      chunks.push(Buffer.from(chunk));
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch { throw fail('Invalid or oversized GameBrain response', 502); }
}
const search = (query = {}) => request('/games', parameters(query, ['query', 'offset', 'limit', 'filters', 'sort', 'sort-order', 'generate-filter-options']));
const suggestions = (query = {}) => request('/games/suggestions', parameters(query, ['query', 'limit'], 10));
const suggestionCache = new Map();
const romanNumbers = { i: '1', ii: '2', iii: '3', iv: '4', v: '5', vi: '6', vii: '7', viii: '8', ix: '9', x: '10' };
const titleKey = value => String(value || '').normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase()
  .replace(/[يى]/g, 'ی').replace(/ك/g, 'ک').replace(/[۰-۹]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
  .replace(/[٠-٩]/g, digit => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
  .replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(/\s+/).map(word => romanNumbers[word] || word).join(' ');
function oneEditAway(a, b) {
  if (a === b) return true;
  if (a.length < 4 || b.length < 4 || Math.abs(a.length - b.length) > 1 || a.length > 64 || b.length > 64) return false;
  if (a.length === b.length) {
    const different = [...a].map((char, index) => char === b[index] ? -1 : index).filter(index => index >= 0);
    return different.length === 1 || different.length === 2 && different[1] === different[0] + 1 && a[different[0]] === b[different[1]] && a[different[1]] === b[different[0]];
  }
  const [short, long] = a.length < b.length ? [a, b] : [b, a];
  let i = 0;
  while (i < short.length && short[i] === long[i]) i++;
  return short.slice(i) === long.slice(i + 1);
}
function rankSuggestions(rows, query, limit, trustedIds = new Set()) {
  const key = titleKey(query), tokens = key.split(' ').filter(Boolean);
  if (!key) return [];
  const score = row => {
    const aliases = [...(Array.isArray(row.aliases) ? row.aliases : []), ...(Array.isArray(row.alternative_names) ? row.alternative_names : [])];
    const names = [row.name, ...aliases.map(value => typeof value === 'string' ? value : value?.name)].filter(Boolean).map(titleKey);
    let best = trustedIds.has(String(row.id)) ? 1 : 0;
    for (const name of names) {
      if (name === key) best = Math.max(best, 100);
      else if (name.startsWith(key + ' ')) best = Math.max(best, 80);
      else if (name.includes(key)) best = Math.max(best, 60);
      else {
        const words = name.split(' ');
        if (tokens.every(token => words.includes(token))) best = Math.max(best, 50);
        else if (tokens.every(token => words.some(word => /^\d+$/.test(token) ? token === word : oneEditAway(token, word)))) best = Math.max(best, 30);
      }
    }
    return best;
  };
  return [...new Map(rows.filter(row => row?.id && row.name).map(row => [row.id, row])).values()]
    .filter(row => score(row) > 0)
    .sort((a, b) => score(b) - score(a) || (b.rating?.count || 0) - (a.rating?.count || 0))
    .slice(0, limit);
}
async function lookupSuggestions(input = {}) {
  parameters(input, ['query', 'limit'], 10);
  if (typeof input.query !== 'string' || input.query.length > 200) throw fail('Invalid GameBrain query');
  const query = input.query.trim(), limit = Number(input.limit || 10);
  if (query.length < 2) return { results: [] };
  const key = `${query.toLowerCase()}:${limit}`;
  const cached = suggestionCache.get(key);
  if (cached && cached.expires > Date.now()) return cached.promise;
  if (suggestionCache.size >= 200) suggestionCache.delete(suggestionCache.keys().next().value);
  const entry = { expires: Date.now() + 24 * 3600000 };
  entry.promise = (async () => {
    let completion, completionError, searchResult;
    try { completion = await module.exports.suggestions({ query, limit: '10' }); } catch (error) { completionError = error; }
    // Sequential provider calls also work on single-concurrent-request plans.
    // Quoting avoids treating a bare word such as Cyberpunk purely as a genre.
    if (query.length >= 4) {
      try { searchResult = await module.exports.search({ query: JSON.stringify(query), limit: '20' }); }
      catch (error) { if (!completion) throw completionError || error; entry.expires = Date.now() + 30000; }
    }
    if (!completion && !searchResult) throw completionError;
    const trustedIds = new Set((completion?.results || []).map(row => String(row.id)));
    return { ...(completion || {}), results: rankSuggestions([...(completion?.results || []), ...(searchResult?.results || [])], query, limit, trustedIds) };
  })();
  suggestionCache.set(key, entry);
  try { return await entry.promise; }
  catch (error) { if (suggestionCache.get(key) === entry) suggestionCache.delete(key); throw error; }
}
const details = id => request(`/games/${gameId(id)}`);
const similar = (id, query = {}) => request(`/games/${gameId(id)}/similar`, parameters(query, ['limit']));
const news = (id, query = {}) => request(`/games/${gameId(id)}/news`, parameters(query, ['offset', 'limit'], 10));
async function filters() {
  const data = await search({ query: '', limit: '1', 'generate-filter-options': 'true' });
  return { filter_options: data.filter_options, sorting_options: data.sorting_options };
}

// Route services follow the project's (req, res) convention.
const getGames = async (req, res) => res.json({ data: await module.exports.search(req.query) });
const getSuggestions = async (req, res) => res.json({ data: await module.exports.lookupSuggestions(req.query) });
const getGame = async (req, res) => res.json({ data: await module.exports.details(req.params.id) });
const getSimilar = async (req, res) => res.json({ data: await module.exports.similar(req.params.id, req.query) });
const getNews = async (req, res) => res.json({ data: await module.exports.news(req.params.id, req.query) });
const getFilters = async (req, res) => res.json({ data: await module.exports.filters() });

module.exports = { search, suggestions, lookupSuggestions, rankSuggestions, details, similar, news, filters, getGames, getSuggestions, getGame, getSimilar, getNews, getFilters };
