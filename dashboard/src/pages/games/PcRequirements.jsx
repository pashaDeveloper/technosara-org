import React from 'react';

const labels = {
  notes: 'Notes', os: 'OS', processor: 'Processor', memory_text: 'Memory', graphics: 'Graphics',
  directx: 'DirectX', network: 'Network', storage_text: 'Storage', sound_card: 'Sound Card',
  additional_notes: 'Additional Notes',
};
function rows(tier) {
  if (!tier) return [];
  if (Array.isArray(tier)) return tier;
  return [
    ...Object.entries(labels).flatMap(([key, label]) => tier[key] ? [{ label, value: tier[key] }] : []),
    ...(tier.other || []),
  ];
}

export function readPcRequirements(value) {
  try {
    const requirements = typeof value === 'string' ? JSON.parse(value) : value;
    return [requirements?.minimum, requirements?.recommended].some(tier => rows(tier).length)
      ? requirements : null;
  } catch {
    return null;
  }
}

export default function PcRequirements({ requirements }) {
  const data = readPcRequirements(requirements);
  if (!data) return <p>سیستم موردنیاز ثبت نشده است.</p>;

  return <div>
    {[['minimum', 'حداقل سیستم'], ['recommended', 'سیستم پیشنهادی']].map(([tier, label]) => {
      const items = rows(data[tier]);
      return items.length > 0 && <section key={tier} className="mb-3">
        <p><strong>{label}</strong></p>
        <dl dir="ltr" className="px-3 text-left [overflow-wrap:anywhere]">
          {items.map((item, index) => <div key={`${item.label}-${index}`} className="flex flex-wrap gap-x-2 py-0.5">
            <dt className="font-semibold">{item.label}</dt>
            <dd className="whitespace-pre-line">{item.value}</dd>
          </div>)}
        </dl>
      </section>;
    })}
  </div>;
}
