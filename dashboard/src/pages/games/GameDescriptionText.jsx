import { createElement, useMemo } from 'react';
import { descriptionFonts, descriptionFontSizes, parseDescription } from './gameDescription';

const tags = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'ul', 'ol', 'li', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
const blocks = new Set(['p', 'li', 'br', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

function renderNode(node, key) {
  if (node.nodeType === 3) return node.textContent;
  if (node.localName === 'span') {
    const { color, fontFamily, fontSize } = node.style;
    const font = fontFamily.replace(/['"]/g, '');
    const style = {
      color: /^(?:#[\da-f]+|(?:rgb|hsl)a?\([\d.,% /+-]+\))$/i.test(color) ? color : undefined,
      fontFamily: descriptionFonts.includes(font) ? font : undefined,
      fontSize: descriptionFontSizes.some(size => fontSize === `${size}px`) ? fontSize : undefined,
    };
    return createElement('span', { key, style }, [...node.childNodes].map(renderNode));
  }
  if (node.localName === 'a') return createElement('span', { key }, [...node.childNodes].map(renderNode));
  if (!tags.has(node.localName)) return null;
  if (node.localName === 'br') return createElement('br', { key });
  return createElement(node.localName, { key }, [...node.childNodes].map(renderNode));
}

function plainNode(node) {
  if (node.nodeType === 3) return node.textContent;
  if (!tags.has(node.localName) && node.localName !== 'a' && node.localName !== 'span') return '';
  const content = [...node.childNodes].map(plainNode).join('');
  return blocks.has(node.localName) ? content + '\n' : content;
}

export function plainDescription(value) {
  const parsed = parseDescription(value);
  return parsed ? [...parsed.childNodes].map(plainNode).join('').trim() : value;
}

export default function GameDescriptionText({ value, excerpt = false }) {
  const parsed = useMemo(() => parseDescription(value), [value]);
  if (excerpt) {
    const text = parsed ? [...parsed.childNodes].map(plainNode).join('').trim() : value;
    return text.length > 240 ? text.slice(0, 240) + '…' : text;
  }
  return parsed ? [...parsed.childNodes].map(renderNode) : value;
}
