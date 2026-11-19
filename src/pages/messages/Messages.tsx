import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import styles from "./Messages.module.css";
import { useMessageNotifications } from "../../contexts/MessageNotificationsContext";

type MessageLocationState = {
  returnTo?: string;
};

export default function Messages() {
  const navigate = useNavigate();
  const { notifications, unreadCount, clearAll } = useMessageNotifications();
  const location = useLocation();
  const locationState = (location.state || {}) as MessageLocationState;
  const returnTo = locationState.returnTo || "/main";

  function handleClose() {
    navigate(returnTo, { replace: true });
  }

  return (
    <div className={styles.screen}>
      <main className={styles.content} data-enter="page">
        <header className={styles.pageHeader}>
          <button
            className={styles.pageBackButton}
            type="button"
            onClick={handleClose}
            aria-label="Voltar"
          >
            <ArrowLeft size={21} />
          </button>

          <div>
            <h1>Mensagens</h1>
            <p>{unreadCount} não lidas · Atendimento dos seus pedidos.</p>
          </div>
        </header>

        <button type="button" className={styles.clearButton} onClick={clearAll} disabled={!notifications.length}>Apagar todas</button>
        <section className={styles.listShell} aria-label="Conversas">
          {!notifications.length && <p className={styles.empty}>Nenhuma mensagem recebida.</p>}
          {notifications.map((thread) => (
            <button
              key={thread.id}
              className={`${styles.threadButton} ${
                !thread.read ? styles.threadButtonActive : ""
              }`}
              type="button"
              onClick={() =>
                navigate(`/order-inform?orderId=${encodeURIComponent(thread.orderId)}#order-chat`)
              }
            >
              <span className={styles.threadAvatar}>
                #
              </span>
              <span className={styles.threadInfo}>
                <span className={styles.threadTop}>
                  <strong>Pedido #{String(thread.orderCode).padStart(4, "0")}</strong>
                  <small>{new Date(thread.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</small>
                </span>
                <span className={styles.threadPreview}>{thread.text}</span>
              </span>
              {!thread.read ? (
                <span className={styles.unreadBadge}>1</span>
              ) : null}
            </button>
          ))}
        </section>
      </main>
    </div>
  );
}
