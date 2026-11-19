import { Navigate, Route, Routes } from "react-router-dom";

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
import { useEffect, useState } from "react";
import Login from "./pages/login/login";
import MessageDetails from "./pages/messages/MessageDetails";
import Messages from "./pages/messages/Messages";
import Register from "./pages/register/register";
import TableIdentifiedMesa from "./components/TableIdentifiedModal/TableIdentifiedMesa";
import TableIdentifiedModal from "./components/TableIdentifiedMesa/TableIdentifiedModal";
import { socket } from "./service/gatway";

function App() {
  const [mesaId] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("mesa")?.trim() || null;
  });
  const [showTableModal, setShowTableModal] = useState(true);
  const [orderUpdates, setOrderUpdates] = useState<Record<string, number>>({});

  useEffect(() => {
    if (mesaId) {
      sessionStorage.setItem("mesaId", mesaId);

      const timeoutId = window.setTimeout(() => {
        setShowTableModal(false);
      }, 5000);

      return () => window.clearTimeout(timeoutId);
    } else {
      sessionStorage.removeItem("mesaId");
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
    <>
      <ScrollToTop />
      {mesaId && showTableModal && (
        <TableIdentifiedModal
          tableNumber={mesaId}
          onClose={() => setShowTableModal(false)}
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
          <Route path="checkout" element={<Checkout mesaId={mesaId} />} />
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
    </>
  );
}

export default App;
