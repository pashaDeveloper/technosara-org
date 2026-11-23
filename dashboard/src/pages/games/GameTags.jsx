import React from 'react';

const consoleNames = {
  ps4: ['PS4', 'پلی‌استیشن ۴'],
  ps5: ['PS5', 'پلی‌استیشن ۵'],
  xbox: ['Xbox'],
  xboxone: ['Xbox One'],
  xboxones: ['Xbox One S'],
  xboxseriess: ['Xbox Series S'],
  xboxseriesx: ['Xbox Series X'],
  xboxseriesxs: ['Xbox Series X|S'],
};
const aliases = {
  playstation4: 'ps4', 'پلیاستیشن4': 'ps4',
  playstation5: 'ps5', 'پلیاستیشن5': 'ps5',
  xboxon: 'xboxone', ایکسباکس: 'xbox', ایکسباکسوان: 'xboxone',
  xboxs: 'xboxseriess', xboxseries: 'xboxseriesxs', xboxsx: 'xboxseriesxs',
};

const normalizePlatform = value => String(value || '').toLowerCase()
  .replace(/[۰-۹٠-٩]/g, digit => String(digit.charCodeAt(0) & 15))
  .replace(/[^\p{L}\p{N}]/gu, '');
const jailbreak = /jailbreak(?:ed)?|jailbroken|جلبریک|جیلبریک|کپیخور/gu;

function platformTags(platform, title) {
  if (!platform) return [];
  const keys = [platform.code, platform.value, platform.slug, platform.name_en, platform.name,
    platform.name_fa, platform.short_name].map(normalizePlatform);
  const isJailbreak = keys.some(key => key !== key.replace(jailbreak, ''));
  const names = keys.map(key => {
    const base = key.replace(jailbreak, '');
    return Object.hasOwn(aliases, base) ? aliases[base] : base;
  }).find(key => Object.hasOwn(consoleNames, key));
  const actions = isJailbreak ? ['دانلود'] : ['دانلود', 'اکانت', 'دیسک'];
  return (consoleNames[names] || []).flatMap(name => actions.map(action =>
    `${action} ${title} برای ${name}${isJailbreak ? ' جلبریک' : ''}`
  ));
}
export function gameTagLabels(game, platformOptions = [], tagOptions = []) {
  const label = item => item?.name_fa || item?.name || item?.name_en || '';
  const resolve = (value, options) => typeof value === 'object'
    ? value : options.find(item => item._id === value);
  const selected = (game.tags || []).map(value => label(resolve(value, tagOptions)));
  const title = (game.name_fa || game.title || game.name || '').trim();
  const defaults = title ? (game.platform_ids || []).flatMap(value => platformTags(resolve(value, platformOptions), title)) : [];
  return [...new Set([...selected, ...defaults].filter(Boolean))];
}

export default function GameTags({ labels, className = '' }) {
  if (!labels.length) return null;
  return <ul aria-label="تگ‌های بازی" className={className}>
    {labels.map(label => <li dir="auto" key={label}>{label}</li>)}
  </ul>;
}
