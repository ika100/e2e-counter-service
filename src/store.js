/**
 * In-memory counter store.
 *
 * Provides named counters that start at 1 on first increment and are
 * incremented by 1 on each subsequent call. Counters are scoped to the
 * process lifetime — they reset on restart.
 */
export class CounterStore {
  #counters = new Map();

  /**
   * Increment the named counter by 1, creating it if it does not exist.
   *
   * @param {string} name - Counter name
   * @returns {number} New counter value (starts at 1 for a new counter)
   */
  increment(name) {
    const current = this.#counters.get(name) ?? 0;
    const next = current + 1;
    this.#counters.set(name, next);
    return next;
  }

  /**
   * Return the current value of a named counter.
   *
   * @param {string} name - Counter name
   * @returns {number|undefined} Current value, or `undefined` if the counter
   *   has never been incremented.
   */
  get(name) {
    return this.#counters.get(name);
  }
}
