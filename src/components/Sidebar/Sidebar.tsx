import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { FiClipboard, FiHome, FiShoppingCart, FiUser } from "react-icons/fi";
import styles from "./Sidebar.module.css";
import {
  CART_STORAGE_KEY,
  CART_UPDATED_EVENT,
  getCartQuantity,
} from "../../utils/cartStorage";

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const cartActive = location.pathname === "/cart";
  const [cartCount, setCartCount] = useState(getCartQuantity);
  const [cartPulse, setCartPulse] = useState(false);
  const previousCartCount = useRef(cartCount);

  useEffect(() => {
    const updateCartCount = () => setCartCount(getCartQuantity());
    const handleStorage = (event: StorageEvent) => {
      if (event.key === CART_STORAGE_KEY) updateCartCount();
    };

    updateCartCount();
    window.addEventListener(CART_UPDATED_EVENT, updateCartCount);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", updateCartCount);

    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, updateCartCount);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", updateCartCount);
    };
  }, []);

  useEffect(() => {
    if (previousCartCount.current === cartCount) return;
    previousCartCount.current = cartCount;
    setCartPulse(true);
    const timeoutId = window.setTimeout(() => setCartPulse(false), 220);
    return () => window.clearTimeout(timeoutId);
  }, [cartCount]);

  return (
    <aside className={styles.sidebar}>
      <nav className={styles.menu}>
        <NavLink
          to="/main"
          className={({ isActive }) =>
            isActive ? styles.active : styles.link
          }
        >
          <FiHome className={styles.icon} />
          <span>Início</span>
        </NavLink>

        <NavLink
          to="/pedidos"
          className={({ isActive }) =>
            isActive ? styles.active : styles.link
          }
        >
          <FiClipboard className={styles.icon} />
          <span>Pedidos</span>
        </NavLink>

        <button
          type="button"
          className={cartActive ? styles.active : styles.link}
          aria-current={cartActive ? "page" : undefined}
          onClick={() => navigate("/cart")}
        >
          <span
            className={`${styles.cartIconWrap} ${
              cartPulse ? styles.cartPulse : ""
            }`}
          >
            <FiShoppingCart className={styles.icon} />
            {cartCount > 0 && (
              <span className={styles.cartBadge}>{cartCount}</span>
            )}
          </span>
          <span>Carrinho</span>
        </button>

        <NavLink
          to="/perfil"
          className={({ isActive }) =>
            isActive ? styles.active : styles.link
          }
        >
          <FiUser className={styles.icon} />
          <span>Perfil</span>
        </NavLink>
      </nav>
    </aside>
  );
}
