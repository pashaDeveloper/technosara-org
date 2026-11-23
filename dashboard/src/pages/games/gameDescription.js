const richText = /^\s*<(?:p|ol|ul|h[1-6]|blockquote)(?:\s|>)/i;
const htmlEntities = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
export const descriptionFonts = [
  'Vazir, Tahoma, sans-serif',
  'Tahoma, sans-serif',
  'Arial, sans-serif',
  'Georgia, serif',
];
export const descriptionFontSizes = [12, 14, 16, 18, 20, 24, 28, 32];

export function asDescriptionHtml(value = '') {
  if (!value || richText.test(value)) return value;
  return value.split(/\r?\n/).map(line =>
    `<p>${line.replace(/[&<>]/g, character => htmlEntities[character]) || '&nbsp;'}</p>`
  ).join('');
}

export function parseDescription(value) {
  if (!richText.test(value)) return null;
  const template = document.createElement('template');
  template.innerHTML = value;
  return template.content;
}
