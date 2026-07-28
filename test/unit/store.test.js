/**
 * Unit tests for CounterStore (TC-001, TC-002, TC-003, TC-004u, TC-005u)
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { CounterStore } from '../../src/store.js';

describe('CounterStore', () => {
  let store;

  beforeEach(() => {
    store = new CounterStore();
  });

  // TC-001: Increment a counter that does not yet exist
  it('TC-001: increment a new counter starts at 1', () => {
    const result = store.increment('newkey');
    assert.equal(result, 1);
    assert.equal(store.get('newkey'), 1);
  });

  // TC-002: Increment an existing counter
  it('TC-002: increment an existing counter increases by 1', () => {
    for (let i = 0; i < 5; i++) store.increment('visits');
    const result = store.increment('visits');
    assert.equal(result, 6);
  });

  // TC-003: Multiple sequential increments
  it('TC-003: multiple sequential increments return 1, 2, 3', () => {
    assert.equal(store.increment('clicks'), 1);
    assert.equal(store.increment('clicks'), 2);
    assert.equal(store.increment('clicks'), 3);
  });

  // TC-004u: Read an existing counter
  it('TC-004u: get returns the current value of an existing counter', () => {
    for (let i = 0; i < 42; i++) store.increment('logins');
    assert.equal(store.get('logins'), 42);
  });

  // TC-005u: Read a counter that has never been incremented
  it('TC-005u: get returns undefined for a counter that has never been incremented', () => {
    assert.equal(store.get('ghost'), undefined);
  });

  // Isolation: counters are independent
  it('different counter names are independent', () => {
    store.increment('a');
    store.increment('a');
    store.increment('b');
    assert.equal(store.get('a'), 2);
    assert.equal(store.get('b'), 1);
  });
});
