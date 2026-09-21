# Dropdown

Controlled, single-value dropdown. Options use `{ value, label }`.

```jsx
<Dropdown
  label="Family"
  value={familyId}
  onChange={setFamilyId}
  options={families}
/>
```

For server search and scroll pagination, pass a stable `loadOptions` callback instead of `options`:

```jsx
async function loadOptions({ search, page, limit, signal }) {
  const response = await fetch(`/api/all?${new URLSearchParams({ search, page, limit })}`, { signal });
  if (!response.ok) throw new Error('Request failed');
  const result = await response.json();
  return {
    options: result.data.map(item => ({ value: item._id, label: item.name })),
    hasMore: result.hasMore,
  };
}
```

Pages start at 1. `pageSize` defaults to 20. `selectedOption` supplies the label of a saved value that is not on the loaded page. Supports `disabled`, `error`, `onBlur` and `inputRef` for form integration. Arrow keys navigate; Enter selects; Escape closes. Requests are debounced and aborted when search changes or the dropdown closes. Failed pages can be retried without discarding loaded options.
