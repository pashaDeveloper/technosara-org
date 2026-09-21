import { readonly, ref, shallowRef } from 'vue';

// Each invocation owns its state; repeated submissions share the pending request.
export function useMutation<TBody, TResult>(request: (body: TBody) => Promise<TResult>) {
  const data = shallowRef<TResult>();
  const error = shallowRef<unknown>();
  const isLoading = ref(false);
  const isSuccess = ref(false);
  const isError = ref(false);
  let pending: Promise<TResult> | undefined;

  function mutate(body: TBody): Promise<TResult> {
    if (pending) return pending;
    data.value = undefined;
    error.value = undefined;
    isLoading.value = true;
    isSuccess.value = false;
    isError.value = false;
    pending = Promise.resolve().then(() => request(body)).then(result => {
      data.value = result;
      isSuccess.value = true;
      return result;
    }, failure => {
      error.value = failure;
      isError.value = true;
      throw failure;
    }).finally(() => {
      isLoading.value = false;
      pending = undefined;
    });
    return pending;
  }

  return { mutate, data: readonly(data), error: readonly(error),
    isLoading: readonly(isLoading), isSuccess: readonly(isSuccess), isError: readonly(isError) };
}
