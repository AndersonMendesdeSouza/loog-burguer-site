import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import { DashboardLayout } from "./components/layouts/DashboardLayout";
import ScrollToTop from "./components/ScrollToTop";
import Cart from "./pages/cart/Cart";
import Checkout from "./pages/checkout/Checkout";
import FoodDetails from "./pages/food/FoodDetails";
import Main from "./pages/main/Main";
import OrderInform from "./pages/orderinfroma/order-inform";
import Orders from "./pages/orders/Orders";
import Profile from "./pages/profile/Profile";
// import Favorites from "./pages/favorites/Favorites";
import { useCallback, useEffect, useState } from "react";
import Login from "./pages/login/login";
import MessageDetails from "./pages/messages/MessageDetails";
import { MessageNotificationsProvider } from "./contexts/MessageNotificationsContext";
import Messages from "./pages/messages/Messages";
import Register from "./pages/register/register";
import TableIdentifiedMesa from "./components/TableIdentifiedModal/TableIdentifiedMesa";
import TableIdentifiedModal from "./components/TableIdentifiedMesa/TableIdentifiedModal";
import { socket } from "./service/gatway";
import {
  clearTableSession,
  createTableSession,
  isTableSessionValid,
  readTableSession,
  saveTableSession,
} from "./utils/tableSessionStorage";

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [tableSession] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has("mesa")) return createTableSession(params.get("mesa") || "");
    return readTableSession();
  });
  const [tableSessionExpired, setTableSessionExpired] = useState(
    () => tableSession !== null && !isTableSessionValid(tableSession),
  );
  const [showExpiredModal, setShowExpiredModal] = useState(tableSessionExpired);
  const mesaId = tableSession && !tableSessionExpired ? tableSession.mesaId : null;
  const [showTableModal, setShowTableModal] = useState(true);
  const [orderUpdates, setOrderUpdates] = useState<Record<string, number>>({});

  useEffect(() => {
    if (isTableSessionValid(tableSession) && tableSession) {
      saveTableSession(tableSession);
    } else {
      clearTableSession();
    }
  }, [tableSession]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("mesa")) return;
    url.searchParams.delete("mesa");
    navigate(`${url.pathname}${url.search}${url.hash}`, {
      replace: true,
      state: location.state,
    });
  }, [navigate, location.state]);

  const expireTableSession = useCallback(() => {
    clearTableSession();
    setTableSessionExpired(true);
    setShowExpiredModal(true);
    setShowTableModal(false);
  }, []);

  const validateTableSession = useCallback(() => {
    const storedSession = readTableSession();
    if (
      !isTableSessionValid(tableSession) ||
      !isTableSessionValid(storedSession) ||
      storedSession?.mesaId !== tableSession?.mesaId ||
      storedSession?.expiresAt !== tableSession?.expiresAt
    ) {
      expireTableSession();
      return false;
    }
    return true;
  }, [tableSession, expireTableSession]);

  useEffect(() => {
    if (!tableSession || tableSessionExpired) return;
    const expiresAt = tableSession.expiresAt;

    function checkExpiration() {
      if (!isTableSessionValid(tableSession)) {
        expireTableSession();
        return;
      }
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(checkExpiration, expiresAt - Date.now());
    }
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") checkExpiration();
    }
    let timeoutId = window.setTimeout(checkExpiration, Math.max(0, expiresAt - Date.now()));
    window.addEventListener("focus", checkExpiration);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("focus", checkExpiration);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [tableSession, tableSessionExpired, expireTableSession]);

  useEffect(() => {
    if (mesaId) {
      const timeoutId = window.setTimeout(() => {
        setShowTableModal(false);
      }, 5000);

      return () => window.clearTimeout(timeoutId);
    }
  }, [mesaId]);

  useEffect(() => {
    function refreshOrder(orderId: string) {
      if (!orderId) return;

      setOrderUpdates((current) => ({
        ...current,
        [orderId]: (current[orderId] || 0) + 1,
      }));
    }

    function handleOrderStatus(orderId: string) {
      refreshOrder(orderId);
    }

    function handleNewMessage(event: { orderId: string }) {
      refreshOrder(event.orderId);
    }

    socket.on("order-status.created", handleOrderStatus);
    socket.on("message.created", handleNewMessage);

    return () => {
      socket.off("order-status.created", handleOrderStatus);
      socket.off("message.created", handleNewMessage);
    };
  }, []);
  return (
    <MessageNotificationsProvider>
      <ScrollToTop />
      {mesaId && showTableModal && (
        <TableIdentifiedModal
          tableNumber={mesaId}
          onClose={() => setShowTableModal(false)}
        />
      )}
      {showExpiredModal && tableSession && (
        <TableIdentifiedModal
          tableNumber={tableSession.mesaId}
          expired
          title="Identificação da mesa expirada"
          description="Aproxime o telefone da plaquinha ou escaneie o QR Code novamente para fazer outro pedido na mesa."
          closeLabel="Entendi"
          onClose={() => setShowExpiredModal(false)}
        />
      )}
      <TableIdentifiedMesa mesaId={mesaId} />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Navigate to="/main" replace />} />
          <Route path="main" element={<Main />} />
          <Route path="foodDetails" element={<FoodDetails />} />
          <Route path="cart" element={<Cart />} />
          <Route path="checkout" element={
            <Checkout
              mesaId={mesaId}
              tableSessionExpired={tableSessionExpired}
              onValidateTableSession={validateTableSession}
            />
          } />
          <Route
            path="order-inform"
            element={<OrderInform orderUpdates={orderUpdates} />}
          />
          <Route path="pedidos" element={<Orders />} />
          {/* <Route path="favoritos" element={<Favorites />} /> */}
          <Route path="mensagens" element={<Messages />} />
          <Route path="mensagens/:threadId" element={<MessageDetails />} />
          <Route path="perfil" element={<Profile />} />
        </Route>
      </Routes>
    </MessageNotificationsProvider>
  );
}

export default App;
