# Technosara dashboard

Vue 3 + Vite frontend with Vue Router, Pinia and Tailwind CSS.
All authentication and account APIs run in the main Express server in ../server.

## Development

- Start MongoDB and the Express server (npm run dev in ../server).
- Run npm install and npm run dev here; open http://localhost:3001.
- API_BASE in .env sets the Vite proxy target (default http://127.0.0.1:8080).
  It is used only by Vite development/preview and is not exposed to the browser.

## Production

- Run npm run build here to create the static dist directory.
- Start the main Express server with npm start in ../server.
- Express serves both the dashboard and API, by default on http://localhost:8080.
- No separate dashboard Node server is needed. For a separate static host, proxy
  /api to Express so browser requests stay on the same origin.

JWTs stay in HttpOnly cookies. Vue Router guards page navigation; Express checks
sessions and administrator roles on API requests. Theme preferences use local storage.

## Checks

- npm run typecheck
- npm run build
- npm test (Vite proxy integration)
- node --test test/dashboard.test.js in ../server (cookie and account routes)
- After building, set DASHBOARD_BROWSER to Chrome or Edge and run
  node test/browser-smoke.mjs for an isolated browser test using mock account services.

Upstream license and attribution remain in LICENSE and the footer.
