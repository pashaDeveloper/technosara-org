import { defineStore } from "pinia";
import { panelText } from "~/utils/panelText";
import type { Ref } from "vue";
import type { ToastParams } from "~/utils/types";
export const useToast = defineStore('Toast', () => {
  const $text = panelText;

  type ToastInterface = {
    publish: (e: ToastParams) => void;
  };

  type ToastRef = Ref<null | ToastInterface>;

  let toast: ToastRef | null = null;

  function setToast(toastInstance: ToastRef) {
    toast = toastInstance;
  }

  type ShowToast =
    | {
        type: 'success';
        title?: string;
        message?: string;
      }
    | {
        type: 'error';
        title?: string;
        message: string;
      };

  function showToast({ type, title, message }: ShowToast) {
    if (type === 'success') {
      if (!title) {
        title = $text('toast.success');
      }
      if (!message) {
        message = $text('toast.saved');
      }
    } else if (type === 'error') {
      if (!title) {
        title = $text('toast.error');
      }
    }
    toast?.value?.publish({
      type,
      title: title ?? '',
      message: message ?? '',
    });
  }

  return { setToast, showToast };
});
