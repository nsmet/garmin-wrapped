// Hermes support for ES2024 grouping used by the website's metrics engine.
if (!(Map as any).groupBy)
  (Map as any).groupBy = (
    items: any[],
    fn: (item: any, index: number) => any,
  ) => {
    const result = new Map();
    let i = 0;
    for (const item of items) {
      const key = fn(item, i++);
      const values = result.get(key);
      if (values) values.push(item);
      else result.set(key, [item]);
    }
    return result;
  };
if (!(Object as any).groupBy)
  (Object as any).groupBy = (
    items: any[],
    fn: (item: any, index: number) => any,
  ) => {
    const result = Object.create(null);
    let i = 0;
    for (const item of items) {
      const key = fn(item, i++);
      (result[key] ||= []).push(item);
    }
    return result;
  };
if (typeof AbortSignal !== "undefined" && !AbortSignal.prototype.throwIfAborted)
  AbortSignal.prototype.throwIfAborted = function () {
    if (this.aborted) {
      const error = new Error("Aborted");
      error.name = "AbortError";
      throw error;
    }
  };
