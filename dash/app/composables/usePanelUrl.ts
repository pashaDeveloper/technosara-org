import { withBase } from 'ufo';

export function usePanelUrl() {
  const baseURL = import.meta.env.BASE_URL;
  return (path: string) => withBase(path, baseURL);
}
