const assert = require('node:assert/strict');
const { after, before, describe, it } = require('node:test');
const { createServer, blogPosts } = require('../server');

async function requestJson(baseUrl, path) {
  const response = await fetch(new URL(path, baseUrl));
  const body = await response.json();

  return { response, body };
}

describe('NexusCode API', () => {
  let instance;
  let baseUrl;

  before(async () => {
    instance = createServer();
    await new Promise((resolve) => instance.server.listen(0, resolve));
    const { port } = instance.server.address();
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    await instance.io.close();

    if (instance.server.listening) {
      await new Promise((resolve, reject) => {
        instance.server.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });

  it('returns health status', async () => {
    const { response, body } = await requestJson(baseUrl, '/api/health');

    assert.equal(response.status, 200);
    assert.deepEqual(body, { status: 'ok', service: 'nexuscode-site' });
  });

  it('returns the published blog list', async () => {
    const { response, body } = await requestJson(baseUrl, '/api/blogs');

    assert.equal(response.status, 200);
    assert.equal(body.length, blogPosts.length);
    assert.equal(body[0].id, 'engineering-excellence');
  });

  it('returns a 404 response for unknown blog posts', async () => {
    const { response, body } = await requestJson(baseUrl, '/api/blogs/not-a-post');

    assert.equal(response.status, 404);
    assert.deepEqual(body, { message: 'Post not found' });
  });
});
