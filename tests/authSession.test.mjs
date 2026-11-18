import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer as createHttpServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';

test('tratamento da sessão usando uma API local', { timeout: 15000 }, async (t) => {
  const storage = new Map();
  const browser = new EventTarget();
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key) => storage.get(key) ?? null,
      removeItem: (key) => storage.delete(key),
    },
  });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: browser });

  let expiredEvents = 0;
  let pendingResponse;
  let notifyPendingRequest;
  let lastAuthorization;
  const server = createHttpServer((request, response) => {
    lastAuthorization = request.headers.authorization;
    response.setHeader('Content-Type', 'application/json');
    if (request.url === '/delayed') {
      pendingResponse = response;
      notifyPendingRequest();
      return;
    }
    if (request.url === '/network-error') {
      request.socket.destroy();
      return;
    }
    const status = request.url === '/server-error' ? 500 : request.url === '/forbidden' ? 403 : 401;
    response.writeHead(status).end(JSON.stringify({ message: 'Erro de teste' }));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let vite;

  function resetSession() {
    storage.set('token', 'current-test-token');
    storage.set('userId', 'test-user');
    storage.set('guest-order-token', 'guest-test-token');
    expiredEvents = 0;
  }

  function assertSessionPreserved() {
    assert.equal(storage.get('token'), 'current-test-token');
    assert.equal(storage.get('userId'), 'test-user');
    assert.equal(expiredEvents, 0);
  }

  try {
    vite = await createViteServer({
      configFile: false,
      root: fileURLToPath(new URL('..', import.meta.url)),
      server: { middlewareMode: true, hmr: false },
      define: { 'import.meta.env.VITE_API_URL': JSON.stringify(origin) },
      logLevel: 'silent',
    });
    const { default: api, SESSION_EXPIRED_EVENT } = await vite.ssrLoadModule('/src/service/api.ts');
    assert.equal(api.defaults.baseURL, origin);
    browser.addEventListener(SESSION_EXPIRED_EVENT, () => expiredEvents++);

    await t.test('401 do token atual limpa a sessão, avisa o contexto e propaga o erro', async () => {
      resetSession();
      await assert.rejects(api.get('/users/me'), (error) => error.response?.status === 401);
      assert.equal(lastAuthorization, 'Bearer current-test-token');
      assert.equal(storage.has('token'), false);
      assert.equal(storage.has('userId'), false);
      assert.equal(storage.get('guest-order-token'), 'guest-test-token');
      assert.equal(expiredEvents, 1);
    });

    await t.test('senha incorreta no login não encerra outra sessão', async () => {
      resetSession();
      await assert.rejects(api.post('/users/login', {}), (error) => error.response?.status === 401);
      assertSessionPreserved();
    });

    await t.test('401 de pedido de visitante não afeta o login da conta', async () => {
      resetSession();
      await assert.rejects(api.get('/orders/guest', {
        headers: { 'X-Order-Token': 'guest-test-token' },
      }), (error) => error.response?.status === 401);
      assert.equal(lastAuthorization, undefined);
      assertSessionPreserved();
    });

    await t.test('401 sem login não emite expiração de sessão', async () => {
      storage.clear();
      expiredEvents = 0;
      await assert.rejects(api.get('/users/me'), (error) => error.response?.status === 401);
      assert.equal(expiredEvents, 0);
    });

    await t.test('resposta atrasada não apaga um login mais recente', async () => {
      resetSession();
      const received = new Promise((resolve) => { notifyPendingRequest = resolve; });
      const rejected = assert.rejects(api.get('/delayed'), (error) => error.response?.status === 401);
      await received;
      storage.set('token', 'new-test-token');
      storage.set('userId', 'new-user');
      pendingResponse.writeHead(401).end('{}');
      await rejected;
      assert.equal(storage.get('token'), 'new-test-token');
      assert.equal(storage.get('userId'), 'new-user');
      assert.equal(expiredEvents, 0);
    });

    for (const path of ['/server-error', '/forbidden', '/network-error']) {
      await t.test(`${path} preserva a sessão`, async () => {
        resetSession();
        await assert.rejects(api.get(path));
        assertSessionPreserved();
      });
    }
  } finally {
    if (vite) await vite.close();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage);
    else delete globalThis.localStorage;
    if (previousWindow) Object.defineProperty(globalThis, 'window', previousWindow);
    else delete globalThis.window;
  }
});
