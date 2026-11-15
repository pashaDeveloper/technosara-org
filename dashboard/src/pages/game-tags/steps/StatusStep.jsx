import React from 'react';
import { definition } from '../definitions';

const fields = definition.fields.filter(field => ["is_active"].includes(field.key));

export default function StatusStep({ register, errors, getValues, parents, countries, id }) {
  return <>
          {fields.map(field => {
            let choices = field.options;
            const rules = {
              required: field.required ? `${field.label} الزامی است` : false,
              min: field.min === undefined ? undefined : { value: field.min, message: `حداقل مقدار ${field.min} است` },
              maxLength: { value: field.type === 'textarea' ? 10000 : 500, message: 'متن بیش از حد طولانی است' },
              validate: value => {
                if (field.required && typeof value === 'string' && !value.trim()) return `${field.label} الزامی است`;
                if (field.type === 'number' && value !== '' && !Number.isSafeInteger(Number(value))) return 'عدد صحیح وارد کنید';
                if (field.type === 'url' && value) { try { const url = new URL(value); if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return 'نشانی معتبر وارد کنید'; } catch { return 'نشانی معتبر وارد کنید'; } }
                if (field.key === 'discontinued_date' && value && getValues('release_date') && value < getValues('release_date')) return 'تاریخ توقف تولید باید پس از عرضه باشد';
                return true;
              },
            };
            const properties = { id: field.key, ...register(field.key, rules), dir: field.dir || (['url', 'date', 'number'].includes(field.type) ? 'ltr' : undefined), 'aria-invalid': Boolean(errors[field.key]) };
            return <label key={field.key} htmlFor={field.key} className="flex flex-col gap-y-1">
              <span className="text-sm">{field.label}{field.required ? '*' : ''}</span>
              {choices ? <select {...properties}><option value="">انتخاب کنید</option>{choices.map(choice => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</select>
                : field.type === 'textarea' ? <textarea {...properties} rows={4} />
                : <input {...properties} type={field.type} min={field.min} step={field.type === 'number' ? 1 : undefined} />}
              {errors[field.key] && <span role="alert" className="text-red-500 text-sm">{errors[field.key].message}</span>}
            </label>;
          })}
  </>;
}
