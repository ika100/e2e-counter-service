/**
 * Integration tests for GET /openapi.json (TC-018)
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../../src/app.js';

describe('GET /openapi.json', () => {
  let app;

  before(async () => {
    app = await buildApp({ logLevel: 'silent' });
    await app.ready();
  });

  after(async () => {
    await app.close();
  });

  // TC-018
  it('TC-018: GET /openapi.json returns 200 with valid OpenAPI 3.1 document', async () => {
    const res = await app.inject({ method: 'GET', url: '/openapi.json' });
    assert.equal(res.statusCode, 200);
    assert.match(res.headers['content-type'], /application\/json/);

    const doc = res.json();

    // Must be OpenAPI 3.1
    assert.equal(doc.openapi, '3.1.0', 'Must declare openapi: "3.1.0"');

    // Must describe /counters/{name}
    assert.ok(doc.paths, 'Must have paths');
    assert.ok(doc.paths['/counters/{name}'], 'Must describe /counters/{name}');
    assert.ok(doc.paths['/counters/{name}'].post, 'Must have POST operation');
    assert.ok(doc.paths['/counters/{name}'].get, 'Must have GET operation');

    // Must describe /health
    assert.ok(doc.paths['/health'], 'Must describe /health');
    assert.ok(doc.paths['/health'].get, 'Must have GET /health operation');

    // Must have info
    assert.ok(doc.info, 'Must have info');
    assert.ok(doc.info.title, 'Must have info.title');
    assert.ok(doc.info.version, 'Must have info.version');
  });
});
