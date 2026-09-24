/** Minimal asynchronous IndexedDB double: requests settle before transaction completion. */
export const createTestIndexedDbFactory = () => {
  const records = new Map<string, unknown>();
  let initialized = false;
  let failWrites = false;
  const database = {
    objectStoreNames: { contains: () => initialized },
    createObjectStore: () => { initialized = true; },
    close: () => undefined,
    transaction: (_name: string, mode: IDBTransactionMode) => {
      const transaction: {
        oncomplete?: () => void;
        onerror?: () => void;
        onabort?: () => void;
        error: Error | null;
        objectStore: () => object;
        abort: () => void;
      } = {
        error: null,
        objectStore: () => ({
          put: (value: { id: string }) => finish(() => records.set(value.id, value)),
          delete: (id: string) => finish(() => records.delete(id)),
          get: (id: string) => request(() => records.get(id)),
          getAll: () => request(() => [...records.values()]),
        }),
        abort: () => transaction.onabort?.(),
      };
      const finish = (action: () => void) => queueMicrotask(() => {
        if (failWrites && mode === "readwrite") {
          transaction.error = new Error("Quota exceeded");
          transaction.onabort?.();
          return;
        }
        action();
        queueMicrotask(() => transaction.oncomplete?.());
      });
      const request = (read: () => unknown) => {
        const result: { result?: unknown; onsuccess?: () => void; onerror?: () => void } = {};
        queueMicrotask(() => {
          result.result = read();
          result.onsuccess?.();
          queueMicrotask(() => transaction.oncomplete?.());
        });
        return result;
      };
      return transaction;
    },
  };
  const factory = {
    open: () => {
      const request: {
        result: typeof database;
        onupgradeneeded?: () => void;
        onsuccess?: () => void;
        onerror?: () => void;
        onblocked?: () => void;
      } = { result: database };
      queueMicrotask(() => {
        if (!initialized) request.onupgradeneeded?.();
        request.onsuccess?.();
      });
      return request;
    },
  } as unknown as IDBFactory;
  return { factory, records, setFailWrites: (value: boolean) => { failWrites = value; } };
};
