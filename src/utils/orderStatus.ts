type OrderStatusData = {
  status: string;
  type?: string;
  mesaId?: string | null;
  tableId?: string | null;
};

export function isTableOrder(order: Omit<OrderStatusData, "status">): boolean {
  return (
    order.type === "DINE_IN" || Boolean(order.tableId || order.mesaId?.trim())
  );
}

export function getOrderStatus(order: OrderStatusData): string {
  if (order.status === "KITCHEN_ACCEPTED") return "PREPARING";
  // Exibe pedidos antigos de mesa e retirada sem a etapa de rota.
  if (
    (isTableOrder(order) || order.type === "PICKUP") &&
    (order.status === "ON_ROUTE" || order.status === "OUT_FOR_DELIVERY")
  )
    return "READY";
  if (order.status === "OUT_FOR_DELIVERY") return "ON_ROUTE";
  return order.status;
}

export function isFinishedOrder(order: OrderStatusData): boolean {
  const status = getOrderStatus(order);
  return status === "DELIVERED";
}
