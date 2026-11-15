import { useSearchParams } from 'react-router-dom';

// Carry list state in the URL through pagination, refreshes and edit forms.
export default function useCatalogListState() {
  const [params, setParams] = useSearchParams();
  const rawPage = params.get('page');
  const number = Number(rawPage);
  const page = /^\d+$/.test(rawPage || '') && Number.isSafeInteger(number) && number > 0 ? number : 1;
  const search = (params.get('search') || '').slice(0, 100);
  const status = ['active', 'inactive'].includes(params.get('status')) ? params.get('status') : 'all';
  function change(values, replace = false) {
    setParams(previous => {
      const next = new URLSearchParams(previous);
      for (const [key, value] of Object.entries(values)) {
        if (value === '' || value === 'all') next.delete(key);
        else next.set(key, String(value));
      }
      return next;
    }, { replace });
  }
  return {
    page, search, status,
    setPage: (value, options = {}) => change({ page: value }, options.replace),
    setSearch: value => change({ search: value.slice(0, 100), page: 1 }, true),
    setStatus: value => change({ status: value, page: 1 }),
    listQuery: params.toString() ? '?' + params.toString() : '',
  };
}
