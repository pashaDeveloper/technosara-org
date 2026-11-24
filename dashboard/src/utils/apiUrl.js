const apiBase = typeof __DASHBOARD_API_BASE__ === 'string' ? __DASHBOARD_API_BASE__ : '';

export const apiUrl = (path = '') => `${apiBase}/api${path}`;
