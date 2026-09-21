# Dashboard API

The dashboard uses Vue composables instead of React/Redux hooks. `api.ts`
centralizes the `/api` base URL, session cookies, and response errors.
Authentication remains in an HttpOnly cookie managed by the server.

```ts
const { mutate: signInAdmin, data, isLoading, isSuccess, isError, error } =
  useSignInAdminMutation();
await signInAdmin({ email, password, remember: true });
```

`mutate` returns a promise that resolves with the response or rejects with the
request error. Concurrent submissions share the pending request. `useSubmit`
adds toast feedback and a completion callback for navigation or form resets.
Loading indicators bind to `isLoading`.

`authApi` provides login, logout, current session, and setup status.
`adminApi` provides administrator creation, initial setup, and registration.
Only routes implemented by the dashboard backend are exposed. Approval lists,
approval messages, administrator lists, and arbitrary administrator updates
from the reference example require additional backend endpoints.
