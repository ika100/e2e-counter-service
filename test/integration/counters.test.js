/**
 * Integration tests for POST/GET /counters/:name
 * TC-004, TC-005, TC-006, TC-007, TC-008, TC-019
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../../src/app.js';

describe('POST /counters/:name', () => {
  let app;

  before(async () => {
    app = await buildApp({ logLevel: 'silent' });
    await app.ready();
  });

  after(async () => {
    await app.close();
  });

  // TC-004: Increment a new counter (auto-create)
  it('TC-004: POST to new counter returns 200 { name, value: 1 }', async () => {
    const res = await app.inject({ method: 'POST', url: '/counters/newpage' });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.deepEqual(body, { name: 'newpage', value: 1 });
  });

  // TC-005: Increment existing counter
  it('TC-005: POST increments an existing counter', async () => {
    for (let i = 0; i < 5; i++) {
      await app.inject({ method: 'POST', url: '/counters/visits' });
    }
    const res = await app.inject({ method: 'POST', url: '/counters/visits' });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.name, 'visits');
    assert.equal(body.value, 6);
  });

  // TC-006: Content-Type header on success
  it('TC-006: response Content-Type is application/json', async () => {
    const res = await app.inject({ method: 'POST', url: '/counters/test' });
    assert.equal(res.statusCode, 200);
    assert.match(res.headers['content-type'], /application\/json/);
  });
});

describe('GET /counters/:name', () => {
  let app;

  before(async () => {
    app = await buildApp({ logLevel: 'silent' });
    await app.ready();
    // seed logins at 42
    for (let i = 0; i < 42; i++) {
      await app.inject({ method: 'POST', url: '/counters/logins' });
    }
  });

  after(async () => {
    await app.close();
  });

  // TC-007: Read an existing counter
  it('TC-007: GET existing counter returns 200 { name, value }', async () => {
    const res = await app.inject({ method: 'GET', url: '/counters/logins' });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.deepEqual(body, { name: 'logins', value: 42 });
  });

  // TC-008: Read a counter that has never been incremented
  it('TC-008: GET unknown counter returns 404 { error, name }', async () => {
    const res = await app.inject({ method: 'GET', url: '/counters/ghost' });
    assert.equal(res.statusCode, 404);
    const body = res.json();
    assert.equal(body.error, 'Counter not found');
    assert.equal(body.name, 'ghost');
  });

  // TC-019: Unknown routes return 404
  it('TC-019: unknown route returns 404', async () => {
    const res = await app.inject({ method: 'GET', url: '/undefined-path' });
    assert.equal(res.statusCode, 404);
  });
});
