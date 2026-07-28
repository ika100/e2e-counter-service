/**
 * Integration tests for rate limiting (TC-014, TC-015)
 *
 * We override rateLimitMax to 5 for test speed.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../../src/app.js';

describe('Rate limiting', () => {
  let app;

  before(async () => {
    app = await buildApp({
      logLevel: 'silent',
      rateLimitMax: 5,
      rateLimitTimeWindow: '1 minute',
    });
    await app.ready();
  });

  after(async () => {
    await app.close();
  });

  // TC-014: Client exceeds rate limit
  it('TC-014: 6th request within window returns 429 with Retry-After header', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await app.inject({ method: 'POST', url: '/counters/rl-test' });
      assert.equal(res.statusCode, 200, `Request ${i + 1} should succeed`);
    }

    const res = await app.inject({ method: 'POST', url: '/counters/rl-test' });
    assert.equal(res.statusCode, 429);
    assert.ok(
      res.headers['retry-after'] !== undefined,
      'Retry-After header should be present',
    );
    const body = res.json();
    assert.equal(body.error, 'Too many requests');
  });

  // TC-015: Health endpoint is exempt from rate limiting
  it('TC-015: GET /health is exempt from rate limiting', async () => {
    // Exhaust rate limit
    for (let i = 0; i < 5; i++) {
      await app.inject({ method: 'POST', url: '/counters/rl-health-test' });
    }
    // Verify limit is hit on counter route
    const limited = await app.inject({ method: 'POST', url: '/counters/rl-health-test' });
    assert.equal(limited.statusCode, 429);

    // Health should still work
    const health = await app.inject({ method: 'GET', url: '/health' });
    assert.equal(health.statusCode, 200);
  });
});
