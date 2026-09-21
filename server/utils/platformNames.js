const { randomUUID } = require('crypto');

exports.shortName = name => {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  return words.length > 1 ? words.map(word => /^\d+$/.test(word) ? word : [...word][0]).join('').toUpperCase() : [...(words[0] || '')].slice(0, 12).join('');
};

exports.platformCode = name => {
  const slug = String(name || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 60);
  return `${slug || 'console'}-${randomUUID()}`;
};
