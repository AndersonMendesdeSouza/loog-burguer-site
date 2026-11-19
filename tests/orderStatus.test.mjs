import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

test('status de mesa e entrega preservam suas etapas', async (t) => {
  const server = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)),
    configFile: false,
    server: { middlewareMode: true, hmr: false },
    logLevel: 'silent',
  });
  try {
    const { getOrderStatus, isFinishedOrder } = await server.ssrLoadModule('/src/utils/orderStatus.ts');
    await t.test('pronto aguarda entrega e não é um pedido encerrado', () => {
      const order = { status: 'READY', type: 'DINE_IN' };
      assert.equal(getOrderStatus(order), 'READY');
      assert.equal(isFinishedOrder(order), false);
    });
    await t.test('entregues de mesa, delivery e retirada continuam entregues', () => {
      for (const type of ['DINE_IN', 'DELIVERY', 'PICKUP']) {
        const order = { status: 'DELIVERED', type };
        assert.equal(getOrderStatus(order), 'DELIVERED');
        assert.equal(isFinishedOrder(order), true);
      }
    });
    await t.test('mesa antiga em rota aparece como pronta, delivery continua em rota', () => {
      for (const status of ['ON_ROUTE', 'OUT_FOR_DELIVERY']) {
        assert.equal(getOrderStatus({ status, type: 'DINE_IN' }), 'READY');
        assert.equal(getOrderStatus({ status, type: 'DELIVERY' }), 'ON_ROUTE');
        assert.equal(getOrderStatus({ status, type: 'PICKUP' }), 'READY');
        assert.equal(getOrderStatus({ status, type: 'DELIVERY', tableId: 'table-id' }), 'READY');
        assert.equal(getOrderStatus({ status, mesaId: '2' }), 'READY');
      }
    });
    await t.test('preparo antigo e cancelamento mantêm seus significados', () => {
      assert.equal(getOrderStatus({ status: 'KITCHEN_ACCEPTED' }), 'PREPARING');
      assert.equal(getOrderStatus({ status: 'CANCELED', type: 'DINE_IN' }), 'CANCELED');
      assert.equal(isFinishedOrder({ status: 'CANCELED' }), false);
    });
  } finally {
    await server.close();
  }
});
