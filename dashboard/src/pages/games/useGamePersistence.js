import { useEffect, useRef, useState } from 'react';
import { gameBody } from './gameFormUtils';
import { definition, formValues } from './definitions';

export const progressFields = ['status', 'release_date', 'official_website', 'developer_ids', 'publisher_ids', 'platform_ids', 'genre_ids', 'theme_ids', 'tags', 'game_mode_ids', 'game_series_ids', 'feature_ids', 'alternate_titles', 'short_description', 'description', 'storage_sizes', 'platform_capabilities', 'capability_status', 'has_persian_subtitles', 'image', 'detail_banner', 'detail_poster', 'detail_gif', 'screenshots', 'platform_covers', 'cover_media_id', 'official_stores', 'offers'];
export function progressBody(values) {
  const body = gameBody(values);
  return Object.fromEntries(progressFields.map(key => [key, body[key]]));
}
async function request(id, action, method, body, keepalive = false) {
  const response = await fetch(`/api/games/${id}/${action}`, { method, keepalive: keepalive && (!body || new TextEncoder().encode(JSON.stringify(body)).length < 60000), headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken')}` }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const result = await response.json();
  if (!response.ok || result.acknowledgement === false) throw new Error(result.description || result.message || 'ذخیرهٔ خودکار ناموفق بود.');
  return result.data;
}
function enqueue(current, body) {
  current.chain = current.chain.catch(() => {}).then(async () => {
    const patch = Object.fromEntries(Object.entries(body).filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(current.saved[key])));
    if (!Object.keys(patch).length) return;
    await request(current.id, 'autosave', 'PATCH', patch, true);
    Object.assign(current.saved, patch);
  });
  return current.chain;
}
export function useGamePersistence({ storedGame, values, getValues, setValue, ready }) {
  const id = storedGame?._id;
  const [recovering, setRecovering] = useState(false);
  const [state, setState] = useState('');
  const [error, setError] = useState('');
  const session = useRef(null);
  useEffect(() => {
    if (!id) return;
    const current = { id, saved: progressBody(formValues(definition, storedGame)), active: true, chain: Promise.resolve(), latestBody: null };
    session.current = current;
    setRecovering(true); setState(''); setError('');
    const before = getValues();
    request(id, 'recover', 'POST').then(result => {
      if (!current.active) return;
      const restored = formValues(definition, result.record);
      current.saved = progressBody(restored);
      for (const key of progressFields) {
        if (JSON.stringify(getValues(key)) === JSON.stringify(before[key]) && JSON.stringify(restored[key]) !== JSON.stringify(before[key])) setValue(key, restored[key], { shouldDirty: false });
      }
      if (result.warnings?.length) setError('بعضی منابع در دسترس نیستند؛ اطلاعات موجود حفظ شد.');
    }).catch(() => { if (current.active) setError('بازیابی اطلاعات ناموفق بود؛ دوباره صفحه را باز کنید.'); })
      .finally(() => { if (current.active) setRecovering(false); });
    const flush = () => { if (current.latestBody) enqueue(current, current.latestBody).catch(() => {}); };
    window.addEventListener('pagehide', flush);
    return () => {
      current.active = false;
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [id]);
  let serialized;
  try { serialized = JSON.stringify(progressBody(values)); } catch { serialized = ''; }
  if (session.current?.id === id && ready && !recovering && serialized) session.current.latestBody = JSON.parse(serialized);
  useEffect(() => {
    const current = session.current;
    if (!current || current.id !== id || !ready || recovering || !serialized) return;
    const timer = setTimeout(async () => {
      const body = JSON.parse(serialized);
      if (Object.keys(body).every(key => JSON.stringify(body[key]) === JSON.stringify(current.saved[key]))) return;
      if (current.active) setState('saving');
      try {
        await enqueue(current, body);
        if (current.active) { setState('saved'); setError(''); }
      } catch (failure) { if (current.active) { setState('error'); setError(failure.message); } }

    }, 500);
    return () => clearTimeout(timer);
  }, [id, serialized, ready, recovering]);
  return { recovering, state, error };
}
