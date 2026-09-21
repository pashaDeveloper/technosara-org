import React, { useMemo } from 'react';
import { Controller } from 'react-hook-form';
import Dropdown from '../../../components/shared/select/Dropdown';
import BrandInput from '../components/BrandInput';
import { useGetPersonOptionsQuery } from '../../../services/people/personApi';

function PersonPhoto({ option }) {
  return <img src={option.photo || '/placeholder.png'} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />;
}

export default function PeopleStep({ control, disabled }) {
  const query = useGetPersonOptionsQuery(undefined, { refetchOnMountOrArgChange: true });
  React.useEffect(() => {
    const refresh = () => query.refetch();
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [query.refetch]);
  const options = useMemo(() => (query.data?.data || []).map(person => ({ value: person._id, label: person.name, photo: person.photo, searchText: [person.name, ...(person.positions || [])].join(' ') })), [query.data]);
  return <div className="flex flex-col gap-6">
    {[{ name: 'founders', label: 'مؤسسان برند' }].map(({ name, label }) =>
      <Controller key={name} name={name} control={control}
        render={({ field, fieldState }) => {
          const selected = field.value || [];
          const available = options.filter(option => !selected.some(person => person.person_id === option.value));
          return <div className="flex flex-col gap-3">
            <Dropdown label={label} inputComponent={BrandInput} optionIcon={PersonPhoto}
              value="" options={available} onBlur={field.onBlur} inputRef={field.ref}
              disabled={disabled || query.isFetching || Boolean(query.error)} error={fieldState.error?.message}
              onChange={id => {
                const option = options.find(item => item.value === id);
                if (option && !selected.some(person => person.person_id === id)) field.onChange([...selected, { person_id: id, name: option.label }]);
              }} />
            {selected.map((person, index) => {
              const current = options.find(option => option.value === person.person_id);
              const displayName = current?.label || person.name;
              return <div key={person.person_id || `legacy-${index}`} className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 dark:border-blue-500">
                <PersonPhoto option={{ photo: current?.photo || person.photo }} />
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm">{displayName}</span>
                  {!person.person_id && <span className="text-xs">نام قدیمی؛ برای اتصال، این مورد را حذف و شخص را از فهرست انتخاب کنید.</span>}
                </div>
                <button type="button" disabled={disabled} className="text-sm text-red-500" aria-label={`حذف ${displayName}`} onClick={() => field.onChange(selected.filter((_, itemIndex) => itemIndex !== index))}>حذف</button>
              </div>;
            })}
          </div>;
        }} />
    )}
    {query.error && <p role="alert" className="text-sm text-red-500">دریافت اشخاص ناموفق بود. <button type="button" onClick={query.refetch}>تلاش دوباره</button></p>}
    {!query.isFetching && !query.error && !options.length && <p className="text-sm">ابتدا شخص موردنظر را در بخش اشخاص ثبت کنید.</p>}
  </div>;
}
