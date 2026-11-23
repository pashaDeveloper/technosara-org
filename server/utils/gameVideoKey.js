function videoKey(url) {
  const host = url.hostname.replace(/^www\./, '');
  if (['youtube.com', 'm.youtube.com', 'youtube-nocookie.com', 'youtu.be'].includes(host)) {
    const id = host === 'youtu.be' ? url.pathname.split('/')[1]
      : url.searchParams.get('v') || url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1];
    if (/^[\w-]{11}$/.test(id || '')) return `youtube:${id}`;
  }
  if (host.endsWith('.steamstatic.com')) {
    const steam = url.pathname.match(/^(.*\/store_trailers\/\d+\/\d+)\//);
    if (steam) return `steam:${steam[1].split('/').slice(-2).join('/')}`;
  }
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|fbclid$|gclid$)/i.test(key)) url.searchParams.delete(key);
  }
  url.searchParams.sort();
  return url.href;
}

module.exports = value => {
  try { return videoKey(new URL(value)); } catch { return value; }
};
