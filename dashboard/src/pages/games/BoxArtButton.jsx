import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { FiDownload } from 'react-icons/fi';
import SendButton from '../../components/shared/button/SendButton';
import { nabApi } from '../../services/nab';

const api = nabApi.injectEndpoints({ endpoints: builder => ({
  fetchPhysicalBoxArt: builder.mutation({ query: body => ({ url: '/games/media/boxart', method: 'POST', body }) }),
}) });
export default function BoxArtButton({ title, platformId, xboxUrl, disabled, onApply, onBusyChange }) {
  const [fetchCover] = api.useFetchPhysicalBoxArtMutation();
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const generation = useRef(0), locked = useRef(false);
  const latest = useRef(); latest.current = { onApply, onBusyChange };
  useEffect(() => {
    ++generation.current; locked.current = false; setLoading(false); setCandidates([]);
    return () => { ++generation.current; if (locked.current) latest.current.onBusyChange?.(false); locked.current = false; };
  }, [title, platformId, xboxUrl]);
  async function load() {
    if (disabled || locked.current) return;
    if (!title?.trim()) { toast.error('ابتدا نام بازی را انتخاب کنید.'); return; }
    const version = ++generation.current;
    locked.current = true; setLoading(true); latest.current.onBusyChange?.(true);
    try {
      const response = await fetchCover({ title, platform_id: platformId, xbox_url: xboxUrl || undefined }).unwrap();
      if (version !== generation.current) return;
      const result = response.data;
      if (result?.candidates?.length) { setCandidates(result.candidates); return; }
      if (!result?.high_quality) throw new Error('کاور جعبه پیدا نشد.');
      latest.current.onApply(result);
      toast.success(`جلد جلو دریافت شد: ${result.title}`);
    } catch (error) {
      if (version === generation.current) toast.error(error.data?.description || (error.data?.message !== 'Error' && error.data?.message) || error.message || 'دریافت کاور ناموفق بود.');
    } finally {
      if (version === generation.current) { locked.current = false; setLoading(false); latest.current.onBusyChange?.(false); }
    }
  }
  return <div>
    <SendButton type="button" label={loading ? 'در حال دریافت…' : 'دریافت کاور جعبه'} icon={FiDownload} disabled={disabled || loading} onClick={load} />
    {candidates.length > 0 && <div className="mt-2 rounded-lg border p-2">
      <p className="mb-2 text-xs">چند کاور پیدا شد؛ کاور مناسب را انتخاب کنید.</p>
      <div className="flex flex-wrap gap-2">{candidates.map((cover, index) => <button type="button" key={cover.source_url} disabled={disabled || loading} onClick={() => { latest.current.onApply(cover); setCandidates([]); toast.success('کاور انتخاب شد.'); }} className="w-24 rounded border p-1 disabled:opacity-50">
        <img src={cover.low_quality} alt={cover.title} className="h-28 w-full object-contain" />
        <span className="text-xs">{cover.title} ({index + 1})</span>
      </button>)}</div>
      <button type="button" onClick={() => setCandidates([])} className="mt-2 text-xs">بستن</button>
    </div>}
  </div>;
}
