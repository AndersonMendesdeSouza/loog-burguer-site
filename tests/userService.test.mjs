import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer as createHttpServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';

test('integração do perfil com uma API local de teste', { timeout: 15000 }, async (t) => {
  const requests = [];
  const profile = {
    id: 'profile-test',
    name: 'Cliente de teste',
    email: 'cliente@exemplo.com',
    phone: '(64) 99999-9687',
    role: 'customer',
    dateRegistration: '2026-01-01',
  };
  const server = createHttpServer(async (request, response) => {
    let rawBody = '';
    for await (const chunk of request) rawBody += chunk;
    const body = rawBody ? JSON.parse(rawBody) : undefined;
    requests.push({ method: request.method, path: request.url, body, authorization: request.headers.authorization });
    response.setHeader('Content-Type', 'application/json');

    if (request.headers.authorization !== 'Bearer profile-test-token') {
      response.writeHead(401).end(JSON.stringify({ message: 'Unauthorized' }));
    } else if (request.method === 'GET' && request.url === '/users/me') {
      response.end(JSON.stringify({ id: profile.id }));
    } else if (request.method === 'GET' && request.url === `/users/${profile.id}`) {
      response.end(JSON.stringify(profile));
    } else if (request.method === 'PUT' && request.url === `/users/${profile.id}`) {
      response.end(JSON.stringify({ ...profile, ...body }));
    } else {
      response.writeHead(404).end(JSON.stringify({ message: 'Not found' }));
    }
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  let token = 'profile-test-token';
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: (key) => key === 'token' ? token : null },
  });

  let vite;
  try {
    vite = await createViteServer({
      configFile: false,
      root: fileURLToPath(new URL('..', import.meta.url)),
      server: { middlewareMode: true, hmr: false },
      define: { 'import.meta.env.VITE_API_URL': JSON.stringify(origin) },
      logLevel: 'silent',
    });
    const { default: api } = await vite.ssrLoadModule('/src/service/api.ts');
    // Nenhuma chamada pode sair da API local de teste.
    assert.equal(api.defaults.baseURL, origin);
    const { UserService } = await vite.ssrLoadModule('/src/service/user.service.ts');

    await t.test('carrega a identidade e envia somente os três campos por PUT autenticado', async () => {
      const identity = await UserService.me();
      const currentUser = await UserService.findOne(identity.id);
      assert.equal(currentUser.name, profile.name);

      const changes = { name: 'Nome atualizado', email: 'novo@exemplo.com', phone: '(64) 3333-4444' };
      const updated = await UserService.update(currentUser.id, changes);
      assert.deepEqual(updated, { ...profile, ...changes });
      assert.deepEqual(requests.map(({ method, path }) => [method, path]), [
        ['GET', '/users/me'],
        ['GET', '/users/profile-test'],
        ['PUT', '/users/profile-test'],
      ]);
      assert.deepEqual(requests[2].body, changes);
      assert.deepEqual(Object.keys(requests[2].body).sort(), ['email', 'name', 'phone']);
      assert.equal(requests[2].authorization, 'Bearer profile-test-token');
    });

    await t.test('propaga sessão expirada para o modal solicitar autenticação', async () => {
      token = null;
      await assert.rejects(
        UserService.update(profile.id, { name: profile.name, email: profile.email, phone: profile.phone }),
        (error) => error.response?.status === 401,
      );
    });
  } finally {
    if (vite) await vite.close();
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage);
    else delete globalThis.localStorage;
  }
});
