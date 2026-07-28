/**
 * Integration tests for CORS (TC-016)
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../../src/app.js';

describe('CORS support', () => {
  let app;

  before(async () => {
    app = await buildApp({
      logLevel: 'silent',
      corsOrigin: 'http://localhost:5173',
    });
    await app.ready();
    // Seed counter so GET responds with 200
    await app.inject({ method: 'POST', url: '/counters/test' });
  });

  after(async () => {
    await app.close();
  });

  // TC-016: Cross-origin request receives CORS headers
  it('TC-016: GET /counters/test with Origin header returns CORS header', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/counters/test',
      headers: { origin: 'http://localhost:5173' },
    });
    assert.equal(res.statusCode, 200);
    const acao = res.headers['access-control-allow-origin'];
    assert.ok(acao, 'Access-Control-Allow-Origin header should be present');
    // Should reflect the configured origin
    assert.equal(acao, 'http://localhost:5173');
  });
});
