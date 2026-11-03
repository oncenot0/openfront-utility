export function createHistoryManager(maxEntries = 200, toKey) {
    let past = [];
    let future = [];
    let current = null;
    let batching = false;
    let hasPending = false;
    let pending = null;
    const keyOf = (value) => toKey ? toKey(value) : value;
    const commit = (value) => {
        const valueKey = keyOf(value);
        if (current !== null && keyOf(current) === valueKey)
            return;
        if (current !== null) {
            past.push(current);
            if (past.length > maxEntries) {
                past = past.slice(past.length - maxEntries);
            }
        }
        current = value;
        future = [];
    };
    const pendingDiffers = () => hasPending && (current === null || keyOf(pending) !== keyOf(current));
    const record = (value) => {
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
            const value = pending;
            pending = null;
            hasPending = false;
            commit(value);
        }
    };
    const undo = () => {
        endBatch(); // never undo past a stroke that is still being committed
        if (past.length === 0 || current === null)
            return null;
        const previous = past.pop();
        future.push(current);
        current = previous;
        return previous;
    };
    const redo = () => {
        endBatch();
        if (future.length === 0 || current === null)
            return null;
        const next = future.pop();
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
