/**
 * Integration tests for GET /health (TC-009, TC-036)
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../../src/app.js';

describe('GET /health', () => {
  let app;

  before(async () => {
    app = await buildApp({ logLevel: 'silent' });
    await app.ready();
  });

  after(async () => {
    await app.close();
  });

  // TC-009
  it('TC-009: GET /health returns 200 { status: "ok", counters: 0 } on empty store', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.status, 'ok');
    assert.equal(body.counters, 0);
  });

  // TC-036
  it('TC-036: GET /health returns counters: 1 after POSTing to a new counter name', async () => {
    // POST to a new counter name
    const postRes = await app.inject({
      method: 'POST',
      url: '/counters/tc036-unique-counter',
    });
    assert.equal(postRes.statusCode, 200);

    // Health should now reflect 1 unique counter
    const res = await app.inject({ method: 'GET', url: '/health' });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.status, 'ok');
    assert.equal(body.counters, 1);
  });
});
