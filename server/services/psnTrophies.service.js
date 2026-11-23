const mongoose = require('mongoose');
const Game = require('../models/game.model');
const { request } = require('./psnAuth.service');
const { inputLinks, sonyCache } = require('./consoleDlc.service');
const { importCollection } = require('./platpricesTrophies.service');
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const mappingCache = new Map();
async function titleIds(input, fetcher) {
  if (input.manual_title_id != null) {
    if (!/^(CUSA|PPSA)\d{5}_\d{2}$/.test(input.manual_title_id)) throw fail('شناسهٔ نسخهٔ PlayStation معتبر نیست.');
    return new Map([[input.manual_title_id, 'manual']]);
  }
  const sources = inputLinks(input).filter(row => row.provider === 'playstation');
  const selectedSony = inputLinks({ console_api_stores: input.console_api_stores }).some(row => row.provider === 'playstation');
  for (let rows of selectedSony ? [] : [input.official_stores, input.offers]) {
    if (typeof rows === 'string') { try { rows = JSON.parse(rows); } catch { throw fail('فهرست فروشگاه‌ها معتبر نیست.'); } }
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      try {
        const url = new URL(row?.url);
        if (url.protocol !== 'https:' || url.username || url.password || url.port || !['playstation.com', 'www.playstation.com'].includes(url.hostname)) continue;
        if (!/^\/[a-z]{2}-[a-z]{2}\/games\/[a-z0-9-]+\/?$/i.test(url.pathname)) continue;
        url.search = ''; url.hash = '';
        if (!sources.some(source => source.url === url.href)) sources.push({ id: 'page/' + url.pathname, url: url.href });
      } catch { /* Unsupported form links are ignored. */ }
    }
  }
  if (!sources.length) throw fail('لینک رسمی نسخهٔ PlayStation بازی موجود نیست.');
  const ids = new Map();
  for (const source of sources) {
    const add = product => {
      const match = String(product || '').match(/(?:^|-)((?:CUSA|PPSA)\d{5}_\d{2})(?:-|$)/);
      if (match) ids.set(match[1], source.id);
    };
    if (source.id.startsWith('product/')) add(source.id.slice(8));
    else {
      let response;
      try { response = await fetcher(source.url, { signal: AbortSignal.timeout(20000), redirect: 'error' }); }
      catch { throw fail('خواندن نسخه‌های فروشگاه PlayStation ناموفق بود.', 502); }
      if (!response.ok) throw fail('فروشگاه PlayStation پاسخ معتبر نداد.', 502);
      const cache = sonyCache(await response.text());
      for (const row of Object.values(cache)) if (row.__typename === 'Product' && (!source.id.startsWith('page/') || row.type === 'GAME')) add(row.id);
    }
  }
  if (!ids.size) throw fail('شناسهٔ CUSA/PPSA نسخهٔ بازی در لینک فروشگاه پیدا نشد.', 409);
  return ids;
}
async function candidates(input = {}, fetcher = fetch) {
  const choices = new Map();
  if (input.game_id) {
    if (!mongoose.isObjectIdOrHexString(input.game_id)) throw fail('شناسهٔ بازی معتبر نیست.');
    const groups = await require('../models/achievementGroup.model').find({ game_id: input.game_id, provider: 'psn', mapping_method: 'manual' }).lean();
    for (const group of groups) {
      const match = group.external_set_id?.match(/^(NPWR\d{5,}_\d{2}):(ps4|ps5)$/);
      if (match) choices.set(group.external_set_id, { ppid: match[1], title: group.name, platforms: [match[2]], manual: true });
    }
  }
  let ids;
  try { ids = await titleIds(input, fetcher); }
  catch (error) {
    if ([400, 409].includes(error.status)) {
      if (choices.size) return [...choices.values()];
      const suggestions = await require('./psrayTrophySearch.service').search(input.title, fetcher);
      if (suggestions.length) return suggestions;
    }
    throw error;
  }
  const resolved = new Set();
  const add = (titleId, sets) => {
    if (sets.length) resolved.add(titleId);
    for (const set of sets) {
      if (!/^NPWR\d{5,}_\d{2}$/.test(set.npCommunicationId || '')) throw fail('شناسهٔ مجموعهٔ PSN معتبر نیست.', 502);
      const platform = titleId.startsWith('PPSA') ? 'ps5' : 'ps4';
      const key = set.npCommunicationId + ':' + platform;
      choices.set(key, { ppid: set.npCommunicationId, product_id: titleId, title: set.trophyTitleName, platforms: [platform], mapping_source: set.mappingSource || 'psn' });
    }
  };
  if (fetcher === fetch) for (const titleId of ids.keys()) {
    const entry = mappingCache.get(titleId);
    if (entry?.expires > Date.now()) add(titleId, entry.sets);
  }
  for (const titleId of ids.keys()) {
    if (resolved.has(titleId)) continue;
    const sets = await require('./gogPsnMapping.service').lookup(titleId, fetcher);
    if (!sets.length) continue;
    add(titleId, sets);
    if (fetcher === fetch) {
      if (mappingCache.size >= 1000) mappingCache.delete(mappingCache.keys().next().value);
      mappingCache.set(titleId, { expires: Date.now() + 6 * 3600000, sets });
    }
  }
  const lookupAccounts = (process.env.PSN_TROPHY_LOOKUP_ACCOUNT_IDS || '').split(',').map(value => value.trim()).filter(Boolean);
  if (lookupAccounts.length > 3 || lookupAccounts.some(value => !/^\d{1,20}$/.test(value))) throw fail('شناسهٔ پروفایل مرجع PSN در تنظیمات معتبر نیست.', 503);
  for (const account of ['me', ...new Set(lookupAccounts)]) {
    const keys = [...ids.keys()].filter(titleId => !resolved.has(titleId));
    for (let offset = 0; offset < keys.length; offset += 5) {
    let page;
    try { page = await request('/api/trophy/v1/users/' + account + '/titles/trophyTitles?npTitleIds=' + encodeURIComponent(keys.slice(offset, offset + 5).join(',')), fetcher); }
    catch (error) { if (account !== 'me' && [403, 404].includes(error.status)) continue; throw error; }
    if (!Array.isArray(page.titles)) throw fail('پاسخ تطبیق تروفی PSN معتبر نیست.', 502);
    for (const title of page.titles) {
      if (!ids.has(title.npTitleId)) throw fail('شناسهٔ برگشتی PSN با نسخهٔ فروشگاه تطابق ندارد.', 502);
      const sets = title.trophyTitles || [];
      add(title.npTitleId, sets);
      if (fetcher === fetch && sets.length) {
        if (mappingCache.size >= 1000) mappingCache.delete(mappingCache.keys().next().value);
        // Cache only the public title identity, never the reference player's progress.
        mappingCache.set(title.npTitleId, { expires: Date.now() + 6 * 3600000, sets: sets.map(set => ({ npCommunicationId: set.npCommunicationId, trophyTitleName: set.trophyTitleName })) });
      }
    }
    }
  }
  if (!choices.size) {
    const suggestions = await require('./psrayTrophySearch.service').search(input.title, fetcher);
    if (suggestions.length) return suggestions;
    throw fail('برای این نسخه نگاشت یکتای NPWR در GamesDB یا پروفایل‌های PSN پیدا نشد.', 409);
  }
  return [...choices.values()];
}
async function preview(input = {}, fetcher = fetch) {
  if (input.manual === true) {
    let npwr = String(input.ppid || '').trim().toUpperCase().replace(/^(NPWR|CUSA|PPSA)-/, '$1');
    if (/^(CUSA|PPSA)\d{5}(?:_\d{2})?$/.test(npwr)) {
      const titleId = npwr.includes('_') ? npwr : npwr + '_00';
      const platform = titleId.startsWith('PPSA') ? 'ps5' : 'ps4';
      if (input.platform && platform !== input.platform) throw fail('CUSA مربوط به PS4 و PPSA مربوط به PS5 است؛ پلتفرم را اصلاح کنید.');
      const choices = await candidates({ manual_title_id: titleId }, fetcher);
      const unique = [...new Set(choices.map(choice => choice.ppid))];
      if (unique.length !== 1) throw fail('این نسخه چند مجموعه دارد؛ شناسهٔ NPWR دقیق را وارد کنید.', 409);
      const data = await readSet(choices[0], platform, fetcher);
      return { ...data, manual: true };
    }
    if (/^NPWR\d{5,9}$/.test(npwr)) npwr += '_00';
    if (!/^NPWR\d{5,9}_\d{2}$/.test(npwr) || (input.platform && !['ps4', 'ps5'].includes(input.platform))) throw fail('شناسهٔ NPWR و پلتفرم معتبر وارد کنید.');
    if (!input.platform) {
      const sets = [];
      let missing;
      for (const platform of ['ps5', 'ps4']) {
        try { sets.push({ ...await readSet({ ppid: npwr }, platform, fetcher), manual: true }); }
        catch (error) { if (error.status !== 404 && error.code !== 'PSN_PLATFORM_MISMATCH') throw error; missing = error; }
      }
      if (!sets.length) throw missing || fail('این مجموعهٔ تروفی در PSN پیدا نشد.', 404);
      return { ...sets[0], sets };
    }
    const data = await readSet({ ppid: npwr }, input.platform, fetcher);
    return { ...data, manual: true };
  }
  const choices = await candidates(input, fetcher);
  const choice = choices.find(row => !row.requires_confirmation && row.ppid === input.ppid && row.product_id === input.product_id && row.platforms.includes(input.platform));
  if (!choice) throw fail('مجموعهٔ تروفی PSN متعلق به نسخهٔ انتخاب‌شده نیست.', 409);
  return readSet(choice, input.platform, fetcher);
}
async function readSet(choice, platform, fetcher = fetch) {
  if (!/^NPWR\d{5,}_\d{2}$/.test(choice.ppid || '') || !['ps4', 'ps5'].includes(platform)) throw fail('شناسه یا پلتفرم مجموعه معتبر نیست.');
  const service = platform === 'ps5' ? 'trophy2' : 'trophy';
  const base = '/api/trophy/v1/npCommunicationIds/' + choice.ppid + '/trophyGroups';
  const summary = await request(base + '?npServiceName=' + service, fetcher);
  if (!Array.isArray(summary.trophyGroups)) throw fail('پاسخ گروه‌های تروفی معتبر نیست.', 502);
  if (!String(summary.trophyTitlePlatform || '').split(',').includes(platform.toUpperCase())) throw Object.assign(fail('پلتفرم مجموعهٔ تروفی با نسخه مطابقت ندارد.', 502), { code: 'PSN_PLATFORM_MISMATCH' });
  const groups = [], allIds = new Set();
  for (const group of summary.trophyGroups) {
    if (!/^(default|\d{3})$/.test(group.trophyGroupId)) throw fail('شناسهٔ گروه تروفی معتبر نیست.', 502);
    const trophies = [], counts = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
    let offset = 0;
    do {
      const page = await request(`${base}/${group.trophyGroupId}/trophies?npServiceName=${service}&limit=100&offset=${offset}`, fetcher);
      if (!Array.isArray(page.trophies)) throw fail('فهرست تروفی PSN معتبر نیست.', 502);
      for (const row of page.trophies) {
        const external_id = String(row.trophyId);
        if (!Number.isSafeInteger(row.trophyId) || row.trophyId < 0 || allIds.has(external_id) || !row.trophyName?.trim() || !Object.hasOwn(counts, row.trophyType)) throw fail('شناسه یا اطلاعات تروفی PSN تکراری یا نامعتبر است.', 502);
        allIds.add(external_id); counts[row.trophyType]++;
        trophies.push({ external_id, name: row.trophyName, description: row.trophyDetail || '', achievement_type: row.trophyType, hidden: Boolean(row.trophyHidden), icon_url: row.trophyIconUrl || null, rarity: null, source_platforms: [platform.toUpperCase()], is_dlc: group.trophyGroupId !== 'default' });
      }
      if (page.nextOffset == null) {
        if (page.totalItemCount !== trophies.length) throw fail('فهرست تروفی PSN ناقص است.', 502);
        break;
      }
      if (!Number.isSafeInteger(page.nextOffset) || page.nextOffset <= offset || page.nextOffset > 10000) throw fail('صفحه‌بندی تروفی PSN معتبر نیست.', 502);
      offset = page.nextOffset;
    } while (true);
    for (const grade of Object.keys(counts)) if (group.definedTrophies?.[grade] !== counts[grade]) throw fail('تعداد تروفی‌های گروه با PSN تطابق ندارد.', 502);
    groups.push({ group_id: group.trophyGroupId, name: group.trophyGroupName, group_type: group.trophyGroupId === 'default' ? 'base_game' : 'update', counts, total: trophies.length, trophies });
  }
  const trophies = groups.flatMap(group => group.trophies);
  const counts = Object.fromEntries(['bronze', 'silver', 'gold', 'platinum'].map(grade => [grade, groups.reduce((n, group) => n + group.counts[grade], 0)]));
  for (const grade of Object.keys(counts)) if (summary.definedTrophies?.[grade] !== counts[grade]) throw fail('فهرست کامل مجموعهٔ PSN دریافت نشد.', 502);
  return { provider: 'psn', ppid: choice.ppid, product_id: choice.product_id, list_id: choice.ppid, platform, game: { title: summary.trophyTitleName, platforms: [platform] }, groups, counts, total: trophies.length, trophies };
}
async function importTrophies(gameId, input, admin, fetcher = fetch) {
  if (!mongoose.isObjectIdOrHexString(gameId)) throw fail('شناسهٔ بازی معتبر نیست.');
  const game = await Game.findById(gameId);
  if (!game) throw fail('بازی ذخیره‌شده پیدا نشد.', 404);
  const data = await preview({ ...input, console_api_stores: input.console_api_stores?.length ? input.console_api_stores : game.console_api_stores || [],
    official_stores: game.official_stores || [], offers: game.offers || [] }, fetcher);
  let saved = 0;
  const failures = [];
  for (const group of data.groups) {
    try {
      const result = await importCollection(gameId, { ...data, ...group, game: { ...data.game, title: group.name } }, admin);
      saved += result.saved;
    } catch (error) { failures.push(error); }
  }
  if (failures.length) throw failures[0];
  return { saved, total: data.total };
}
module.exports = { candidates, preview, importTrophies, readSet, titleIds };
