/**
 * Integration tests for input validation (TC-010, TC-011, TC-012, TC-013, TC-017)
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../../src/app.js';

describe('Counter name validation', () => {
  let app;

  before(async () => {
    app = await buildApp({ logLevel: 'silent' });
    await app.ready();
  });

  after(async () => {
    await app.close();
  });

  // TC-010: Name exceeds max length (101 chars)
  it('TC-010: POST with 101-char name returns 400 { error: "Invalid counter name" }', async () => {
    const name = 'a'.repeat(101);
    const res = await app.inject({ method: 'POST', url: `/counters/${name}` });
    assert.equal(res.statusCode, 400);
    const body = res.json();
    assert.equal(body.error, 'Invalid counter name');
  });

  // TC-011: Name contains invalid characters (space / special chars)
  it('TC-011: POST with invalid characters in name returns 400', async () => {
    // URL-encoded space = %20
    const res = await app.inject({ method: 'POST', url: '/counters/bad%20name' });
    assert.equal(res.statusCode, 400);
    const body = res.json();
    assert.equal(body.error, 'Invalid counter name');
  });

  it('TC-011b: GET with invalid characters in name returns 400', async () => {
    const res = await app.inject({ method: 'GET', url: '/counters/foo!bar' });
    assert.equal(res.statusCode, 400);
    const body = res.json();
    assert.equal(body.error, 'Invalid counter name');
  });

  // TC-012: SQL injection attempt
  it("TC-012: SQL injection in name returns 400", async () => {
    const res = await app.inject({
      method: 'POST',
      url: "/counters/';DROP TABLE counters--",
    });
    assert.equal(res.statusCode, 400);
    const body = res.json();
    assert.equal(body.error, 'Invalid counter name');
  });

  // TC-013: Valid name at max boundary (100 chars)
  it('TC-013: POST with 100-char valid name returns 200', async () => {
    const name = 'a'.repeat(100);
    const res = await app.inject({ method: 'POST', url: `/counters/${name}` });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.name, name);
    assert.equal(body.value, 1);
  });

  // TC-017: Oversized body returns 413
  it('TC-017: POST with body > 1KB returns 413', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/counters/test',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ data: 'x'.repeat(2000) }),
    });
    assert.equal(res.statusCode, 413);
  });
});
