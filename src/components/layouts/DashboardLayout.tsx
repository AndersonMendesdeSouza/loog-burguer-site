import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Header } from "../Header/Header";
import { Sidebar } from "../Sidebar/Sidebar";
import styles from "./DashboardLayout.module.css";

export function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <Sidebar />

      {location.pathname !== "/main" && (
        <div className={styles.desktopHeader}>
          <Header showSearch={false} onCartClick={() => navigate("/cart")} />
        </div>
      )}

      <div className={styles.main}>
        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
