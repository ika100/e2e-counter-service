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

  /**
   * Delete a named counter from the store.
   *
   * @param {string} name - Counter name
   * @returns {boolean} `true` if the counter existed and was deleted,
   *   `false` if the counter did not exist.
   */
  delete(name) {
    return this.#counters.delete(name);
  }

  /**
   * Return the number of unique counter names in the store.
   *
   * @returns {number} Count of unique counter names.
   */
  size() {
    return this.#counters.size;
  }

  /**
   * Return the number of unique counter names in the store.
   *
   * @returns {number} Count of unique counter names.
   */
  size() {
    return this.#counters.size;
  }

  /**
   * Return all counters sorted by name.
   *
   * @returns {{ name: string, value: number }[]} Sorted array of counter entries.
   */
  list() {
    return [...this.#counters.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, value]) => ({ name, value }));
  }
}
