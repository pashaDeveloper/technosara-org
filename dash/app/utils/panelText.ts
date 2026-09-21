import messages from './panel-text.json';

// Fixed Persian UI copy; named values are rendered as plain text by Vue.
export function panelText(key: string, values: Record<string, unknown> = {}) {
  const text = messages[key as keyof typeof messages] ?? key;
  return text.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    Object.hasOwn(values, name) ? String(values[name]) : placeholder
  );
}

export function panelDate(value: Date | number | string) {
  return new Date(value).toLocaleDateString('fa-IR');
}
