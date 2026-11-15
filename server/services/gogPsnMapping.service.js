// GamesDB associates store release IDs with one canonical game. Only accept a
// single NPWR association; multiple regional/platform sets remain ambiguous.
async function lookup(titleId, fetcher = fetch) {
  if (!/^(CUSA|PPSA)\d{5}_\d{2}$/.test(titleId)) return [];
  try {
    const response = await fetcher(`https://gamesdb.gog.com/platforms/psn/external_releases/${titleId}`, { headers: { Accept: 'application/json' }, redirect: 'error', signal: AbortSignal.timeout(12000) });
    if (!response.ok) return [];
    const text = await response.text();
    if (text.length > 4 * 1024 * 1024) return [];
    const data = JSON.parse(text);
    if (data.platform_id !== 'psn' || data.external_id !== titleId || !data.game_id || data.game?.id !== data.game_id || !Array.isArray(data.game.releases)) return [];
    const releases = data.game.releases.filter(row => row.platform_id === 'psn');
    if (!releases.some(row => row.external_id === titleId)) return [];
    const npwrs = [...new Set(releases.map(row => row.external_id).filter(value => /^NPWR\d{5,}_\d{2}$/.test(value || '')))];
    if (npwrs.length !== 1) return [];
    const name = data.game.title?.['en-US'] || data.game.title?.['*'];
    if (typeof name !== 'string' || !name.trim()) return [];
    return [{ npCommunicationId: npwrs[0], trophyTitleName: name, mappingSource: 'gog-gamesdb' }];
  } catch { return []; }
}
module.exports = { lookup };
