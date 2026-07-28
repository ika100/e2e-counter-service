/**
 * Integration tests for POST/GET/DELETE /counters/:name and GET /counters
 * TC-004, TC-005, TC-006, TC-007, TC-008, TC-019, TC-030, TC-031, TC-032, TC-033, TC-034, TC-035
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

describe('DELETE /counters/:name', () => {
  let app;

  before(async () => {
    app = await buildApp({ logLevel: 'silent' });
    await app.ready();
  });

  after(async () => {
    await app.close();
  });

  // TC-033: Delete an existing counter returns 204
  it('TC-033: DELETE existing counter returns 204 No Content', async () => {
    await app.inject({ method: 'POST', url: '/counters/to-delete' });
    const res = await app.inject({ method: 'DELETE', url: '/counters/to-delete' });
    assert.equal(res.statusCode, 204);
    assert.equal(res.body, '');
  });

  // TC-034: Delete a non-existent counter returns 404
  it('TC-034: DELETE non-existent counter returns 404 { error, name }', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/counters/nonexistent' });
    assert.equal(res.statusCode, 404);
    const body = res.json();
    assert.equal(body.error, 'Counter not found');
    assert.equal(body.name, 'nonexistent');
  });

  // TC-035: Subsequent GET after DELETE returns 404
  it('TC-035: GET after DELETE returns 404', async () => {
    await app.inject({ method: 'POST', url: '/counters/ephemeral' });
    await app.inject({ method: 'DELETE', url: '/counters/ephemeral' });
    const res = await app.inject({ method: 'GET', url: '/counters/ephemeral' });
    assert.equal(res.statusCode, 404);
    const body = res.json();
    assert.equal(body.error, 'Counter not found');
    assert.equal(body.name, 'ephemeral');
  });
});

describe('GET /counters', () => {
  let app;

  before(async () => {
    app = await buildApp({ logLevel: 'silent' });
    await app.ready();
  });

  after(async () => {
    await app.close();
  });

  // TC-030: Empty store returns { counters: [] }
  it('TC-030: GET /counters returns 200 { counters: [] } when store is empty', async () => {
    const res = await app.inject({ method: 'GET', url: '/counters' });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.deepEqual(body, { counters: [] });
  });

  // TC-031: Returns all counters sorted by name
  it('TC-031: GET /counters returns all counters sorted by name', async () => {
    await app.inject({ method: 'POST', url: '/counters/zebra' });
    await app.inject({ method: 'POST', url: '/counters/alpha' });
    await app.inject({ method: 'POST', url: '/counters/alpha' });
    await app.inject({ method: 'POST', url: '/counters/middle' });

    const res = await app.inject({ method: 'GET', url: '/counters' });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.deepEqual(body, {
      counters: [
        { name: 'alpha', value: 2 },
        { name: 'middle', value: 1 },
        { name: 'zebra', value: 1 },
      ],
    });
  });

  // TC-032: Response includes CORS header and correct Content-Type
  it('TC-032: GET /counters response has correct Content-Type and CORS header', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/counters',
      headers: { origin: 'http://localhost:5173' },
    });
    assert.equal(res.statusCode, 200);
    assert.match(res.headers['content-type'], /application\/json/);
    assert.ok(
      res.headers['access-control-allow-origin'],
      'CORS header access-control-allow-origin should be present',
    );
  });
});
