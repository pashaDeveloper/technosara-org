/// <reference types="vite/client" />
import type { panelText, panelDate } from './utils/panelText';
declare module 'vue' {
  interface ComponentCustomProperties {
    $text: typeof panelText;
    $date: typeof panelDate;
  }
}
