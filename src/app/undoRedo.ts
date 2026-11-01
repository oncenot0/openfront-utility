export type HistoryManager<T = string> = {
  record: (value: T) => void;
  undo: () => T | null;
  redo: () => T | null;
  canUndo: () => boolean;
  canRedo: () => boolean;
  /**
   * Start grouping changes. While a batch is open, `record` only remembers the
   * latest value; `endBatch` then commits it as ONE undo step. Used so a whole
   * pencil stroke undoes in a single step instead of cell by cell.
   */
  beginBatch: () => void;
  endBatch: () => void;
};

export function createHistoryManager<T = string>(
  maxEntries = 200,
  toKey?: (value: T) => string
): HistoryManager<T> {
  let past: T[] = [];
  let future: T[] = [];
  let current: T | null = null;
  let batching = false;
  let hasPending = false;
  let pending: T | null = null;

  const keyOf = (value: T) =>
    toKey ? toKey(value) : (value as unknown as string);

  const commit = (value: T) => {
    const valueKey = keyOf(value);
    if (current !== null && keyOf(current) === valueKey) return;
    if (current !== null) {
      past.push(current);
      if (past.length > maxEntries) {
        past = past.slice(past.length - maxEntries);
      }
    }
    current = value;
    future = [];
  };

  const pendingDiffers = () =>
    hasPending && (current === null || keyOf(pending as T) !== keyOf(current));

  const record = (value: T) => {
    if (batching) {
      pending = value;
      hasPending = true;
      return;
    }
    commit(value);
  };

  const beginBatch = () => {
    batching = true;
  };

  const endBatch = () => {
    batching = false;
    if (hasPending) {
      const value = pending as T;
      pending = null;
      hasPending = false;
      commit(value);
    }
  };

  const undo = () => {
    endBatch(); // never undo past a stroke that is still being committed
    if (past.length === 0 || current === null) return null;
    const previous = past.pop()!;
    future.push(current);
    current = previous;
    return previous;
  };

  const redo = () => {
    endBatch();
    if (future.length === 0 || current === null) return null;
    const next = future.pop()!;
    past.push(current);
    current = next;
    return next;
  };

  return {
    record,
    undo,
    redo,
    canUndo: () => past.length > 0 || (current !== null && pendingDiffers()),
    canRedo: () => future.length > 0 && !pendingDiffers(),
    beginBatch,
    endBatch,
  };
}
