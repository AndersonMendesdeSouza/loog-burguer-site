import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { Hamburger, MessageSquare, Search, ShoppingCart, UserRound, X } from "lucide-react";
import styles from "./Header.module.css";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  CART_STORAGE_KEY,
  CART_UPDATED_EVENT,
  getCartQuantity,
} from "../../utils/cartStorage";
import { useMessageNotifications } from "../../contexts/MessageNotificationsContext";
import { useAuth } from "../../contexts/AuthContext";

type HeaderProps = {
  search?: string;
  searchRef?: RefObject<HTMLInputElement | null>;
  cartCount?: number;
  searchPlaceholder?: string;
  showSearch?: boolean;
  storeOpen?: boolean;
  onCartClick: () => void;
  onSearchChange?: (value: string) => void;
  onClearSearch?: () => void;
};

export function Header({
  search = "",
  searchRef,
  cartCount,
  searchPlaceholder = "Buscar no cardápio...",
  showSearch = true,
  storeOpen,
  onCartClick,
  onSearchChange,
  onClearSearch,
}: HeaderProps) {
  const navigate = useNavigate();
  const { unreadCount } = useMessageNotifications();
  const location = useLocation();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [storedCartCount, setStoredCartCount] = useState(getCartQuantity);
  const badgeCount = cartCount ?? storedCartCount;
  const showAuthActions = !authLoading && !isAuthenticated;
  const headerRef = useRef<HTMLElement | null>(null);
  const [headerHeight, setHeaderHeight] = useState(70);

  useLayoutEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    function updateHeaderHeight() {
      if (!header) return;
      const height = Math.ceil(header.getBoundingClientRect().height);
      setHeaderHeight(height);
      document.documentElement.style.setProperty("--site-header-height", `${height}px`);
    }

    updateHeaderHeight();
    const observer = new ResizeObserver(updateHeaderHeight);
    observer.observe(header);

    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty("--site-header-height");
    };
  }, []);

  useEffect(() => {
    const updateCartCount = () => setStoredCartCount(getCartQuantity());
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

  return (
    <>
      <div className={styles.headerSpacer} style={{ height: headerHeight }} aria-hidden="true" />
      <header ref={headerRef} className={styles.header}>
        <div
          className={`${styles.headerContent} ${!showSearch ? styles.withoutSearch : ""} ${showAuthActions ? styles.withAuth : ""}`}
          data-enter="page"
        >
          <div className={styles.brand}>
            <Hamburger className={styles.brandLogo} aria-hidden="true" />
            <div className={styles.brandText}>
              <span className={styles.brandName}>Burguer</span>
              <span className={styles.brandSubtitle}>Hamburgueria</span>
            </div>
            {storeOpen !== undefined && (
              <span className={`${styles.storeStatus} ${!storeOpen ? styles.storeClosed : ""}`} role="status">
                <span className={styles.storeStatusDot} aria-hidden="true" />
                {storeOpen ? "ABERTO AGORA" : "FECHADO"}
              </span>
            )}
          </div>

          <nav className={styles.desktopNavigation} aria-label="Navegação principal">
            <NavLink
              to="/main"
              className={({ isActive }) => isActive ? styles.navigationActive : styles.navigationLink}
            >
              Início
            </NavLink>
            <NavLink
              to="/pedidos"
              className={({ isActive }) =>
                isActive || location.pathname === "/order-inform"
                  ? styles.navigationActive
                  : styles.navigationLink
              }
            >
              Pedidos
            </NavLink>
            <NavLink
              to="/perfil"
              className={({ isActive }) => isActive ? styles.navigationActive : styles.navigationLink}
            >
              Perfil
            </NavLink>
          </nav>

          {showSearch && (
            <div className={styles.searchInputWrap}>
              <Search size={19} aria-hidden="true" />
              <input
                ref={searchRef}
                className={styles.searchInput}
                value={search}
                onChange={(event) => onSearchChange?.(event.target.value)}
                placeholder={searchPlaceholder}
                aria-label="Buscar produtos no cardápio"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                inputMode="search"
              />
              {search && (
                <button
                  type="button"
                  className={styles.searchClear}
                  onClick={onClearSearch}
                  aria-label="Limpar busca"
                >
                  <X size={18} />
                </button>
              )}
            </div>
          )}

          {showAuthActions && (
            <div className={styles.authActions}>
              <button
                type="button"
                className={styles.authButton}
                onClick={() => navigate("/login")}
              >
                <UserRound size={20} aria-hidden="true" />
                Entrar
              </button>
              <button
                type="button"
                className={`${styles.authButton} ${styles.authPrimary}`}
                onClick={() => navigate("/register")}
              >
                Criar conta
              </button>
            </div>
          )}

          <div className={styles.headerActions}>
            <button className={styles.cartButton} type="button" onClick={() => navigate("/mensagens")}
              aria-label={`Abrir mensagens: ${unreadCount} não lidas`}>
              <MessageSquare size={24} aria-hidden="true" />
              {unreadCount > 0 && <span className={styles.cartBadge}>{unreadCount > 99 ? "99+" : unreadCount}</span>}
            </button>
            <button
              className={styles.cartButton}
              type="button"
              onClick={onCartClick}
              aria-label="Abrir carrinho"
            >
              <ShoppingCart size={24} />
              {badgeCount > 0 && (
                <span className={styles.cartBadge}>{badgeCount}</span>
              )}
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
