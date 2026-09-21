import PlatformInput from '../components/PlatformInput';
import React from 'react';
import { Controller } from 'react-hook-form';
import Dropdown from '../../../components/shared/select/Dropdown';

export default function DetailsStep({ control, disabled, parents, brands, id }) {
  const platforms = parents.data?.data || [];
  const excluded = new Set(id ? [id] : []);
  let changed = true;
  while (changed) {
    changed = false;
    for (const platform of platforms) {
      if (excluded.has(platform.parent_id?._id || platform.parent_id) && !excluded.has(platform._id)) {
        excluded.add(platform._id);
        changed = true;
      }
    }
  }
  const fields = [
    { name: 'parent_id', label: 'پلتفرم والد', query: parents, items: platforms.filter(item => !excluded.has(item._id)) },
    { name: 'brand_id', label: 'برند', query: brands, items: brands.data?.data || [] },
  ];
  return <div className="flex flex-col gap-4">
    {fields.map(({ name, label, query, items }) => <Controller key={name} name={name} control={control}
      render={({ field, fieldState }) => <Dropdown inputComponent={PlatformInput} label={label} value={field.value} onChange={field.onChange}
        onBlur={field.onBlur} inputRef={field.ref} error={fieldState.error?.message}
        disabled={disabled || query.isFetching || Boolean(query.error)}
        options={items.map(item => ({ value: item._id, label: item.name }))} />} />)}
  </div>;
}
