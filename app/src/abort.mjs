export function abortError(message = "The import was cancelled.") {
  const error = new Error(message);
  error.name = "AbortError";
  return error;
}
export function throwIfAborted(signal) {
  if (signal?.aborted)
    throw signal.reason instanceof Error ? signal.reason : abortError();
}
// Do not depend on AbortSignal.any/timeout or DOMException in Hermes.
export function abortable(promise, signal) {
  throwIfAborted(signal);
  return new Promise((resolve, reject) => {
    const abort = () => {
      cleanup();
      reject(signal.reason instanceof Error ? signal.reason : abortError());
    };
    const cleanup = () => signal?.removeEventListener("abort", abort);
    signal?.addEventListener("abort", abort, { once: true });
    Promise.resolve(promise).then(
      (value) => {
        cleanup();
        resolve(value);
      },
      (error) => {
        cleanup();
        reject(error);
      },
    );
  });
}
export function delay(ms, signal) {
  throwIfAborted(signal);
  return new Promise((resolve, reject) => {
    const finish = () => {
      signal?.removeEventListener("abort", abort);
      resolve();
    };
    const timer = setTimeout(finish, ms);
    const abort = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      reject(abortError());
    };
    signal?.addEventListener("abort", abort, { once: true });
  });
}
