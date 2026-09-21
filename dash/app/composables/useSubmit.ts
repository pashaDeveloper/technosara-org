import { useToast } from "~/stores/toast";
import { getApiErrorMessage, type ApiResponse } from '~/services/api';
import { useMutation } from './useMutation';

type RevertFn<T> = (success: boolean, data: T | undefined) => Promise<void>;

type SubmitOpts<T> = {
  revert: RevertFn<T>;
  successMsg?: string;
  noSuccessToast?: boolean;
};

type Body = Record<string, unknown> | null | undefined;

export function useSubmit<T, TBody = Body>(
  fetcher: (data: TBody) => Promise<T>,
  opts: SubmitOpts<T>
) {
  const toast = useToast();

  const mutation = useMutation(fetcher);
  return async (data: TBody) => {
    if (mutation.isLoading.value) return;
    try {
      const res = await mutation.mutate(data);

      if (!opts.noSuccessToast) {
        toast.showToast({
          type: 'success',
          message: (res as ApiResponse | null)?.description || opts.successMsg,
        });
      }

      await opts.revert(true, res);
    } catch (e) {
      toast.showToast({ type: 'error', message: getApiErrorMessage(e) });
      await opts.revert(false, undefined);
    }
  };
}
