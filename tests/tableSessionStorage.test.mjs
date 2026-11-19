import test, { beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  TABLE_SESSION_DURATION_MS,
  TABLE_SESSION_STORAGE_KEY,
  createTableSession,
  readTableSession,
  saveTableSession,
  clearTableSession,
  isTableSessionValid,
} from '../src/utils/tableSessionStorage.ts';

const entries = new Map();
const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
Object.defineProperty(globalThis, 'sessionStorage', {
  configurable: true,
  value: {
    getItem: (key) => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
    removeItem: (key) => entries.delete(key),
  },
});
beforeEach(() => entries.clear());
after(() => {
  if (previousStorage) Object.defineProperty(globalThis, 'sessionStorage', previousStorage);
  else delete globalThis.sessionStorage;
});

test('a leitura da plaquinha cria uma identificação de vinte minutos e normaliza a mesa', () => {
  const now = 1_000_000;
  assert.deepEqual(createTableSession(' 03 ', now), {
    mesaId: '3', expiresAt: now + 20 * 60 * 1000,
  });
});

test('recuperar a mesa após atualizar preserva o prazo original', () => {
  const original = createTableSession('3', 1_000_000);
  saveTableSession(original);
  assert.deepEqual(readTableSession(), original);
  assert.deepEqual(readTableSession(), original);
  assert.equal(isTableSessionValid(readTableSession(), original.expiresAt - 1), true);
  assert.equal(isTableSessionValid(readTableSession(), original.expiresAt), false);
  assert.equal(isTableSessionValid(readTableSession(), original.expiresAt + 86_400_000), false);
});

test('uma nova leitura pode identificar outra mesa com um novo prazo', () => {
  saveTableSession(createTableSession('3', 1_000_000));
  const next = createTableSession('4', 1_000_000 + TABLE_SESSION_DURATION_MS);
  saveTableSession(next);
  assert.deepEqual(readTableSession(), next);
  assert.equal(isTableSessionValid(next, next.expiresAt - 1), true);
});

test('rejeita números de mesa inválidos e dados antigos sem expiração', () => {
  for (const value of ['', '0', '-1', '3.5', 'abc', '9007199254740992']) {
    assert.equal(createTableSession(value), null);
  }
  for (const value of ['3', 'null', '[]', '{"mesaId":"3"}', '{"mesaId":"abc","expiresAt":123}', '{"mesaId":"3","expiresAt":"123"}']) {
    entries.set(TABLE_SESSION_STORAGE_KEY, value);
    assert.equal(readTableSession(), null);
  }
});

test('limpar a identificação não remove o acesso aos pedidos de visitante', () => {
  entries.set('mb_guest_order_order-id', 'guest-token');
  saveTableSession(createTableSession('3'));
  clearTableSession();
  assert.equal(readTableSession(), null);
  assert.equal(entries.get('mb_guest_order_order-id'), 'guest-token');
});

test('dados corrompidos ou armazenamento indisponível não quebram a página', (t) => {
  t.mock.method(console, 'error', () => {});
  entries.set(TABLE_SESSION_STORAGE_KEY, '{invalid');
  assert.equal(readTableSession(), null);
  for (const method of ['getItem', 'setItem', 'removeItem']) {
    t.mock.method(sessionStorage, method, () => { throw new Error('Armazenamento bloqueado'); });
  }
  assert.equal(readTableSession(), null);
  assert.doesNotThrow(() => saveTableSession(createTableSession('3')));
  assert.doesNotThrow(() => clearTableSession());
});
