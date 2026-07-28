/**
 * Integration tests for GET /version (TC-VER-001, TC-VER-002, TC-VER-003)
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { buildApp } from '../../src/app.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf8'));

describe('GET /version', () => {
  let app;

  before(async () => {
    app = await buildApp({ logLevel: 'silent' });
    await app.ready();
  });

  after(async () => {
    await app.close();
  });

  // TC-VER-001: 200 OK with correct shape
  it('TC-VER-001: returns 200 with name, version, and gitUrl', async () => {
    const res = await app.inject({ method: 'GET', url: '/version' });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.name, 'counter-service');
    assert.equal(typeof body.version, 'string');
    assert.equal(body.gitUrl, 'https://github.com/ika100/e2e-counter-service');
  });

  // TC-VER-002: version matches package.json
  it('TC-VER-002: version matches package.json', async () => {
    const res = await app.inject({ method: 'GET', url: '/version' });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.version, pkg.version);
  });

  // TC-VER-003: endpoint excluded from rate limiting (250 calls don't trigger 429)
  it('TC-VER-003: 250 rapid calls do not trigger rate limiting (429)', async () => {
    const requests = Array.from({ length: 250 }, () =>
      app.inject({ method: 'GET', url: '/version' }),
    );
    const results = await Promise.all(requests);
    const statuses = results.map(r => r.statusCode);
    assert.ok(
      statuses.every(s => s === 200),
      `Expected all 200 but got: ${[...new Set(statuses)].join(', ')}`,
    );
  });
});
