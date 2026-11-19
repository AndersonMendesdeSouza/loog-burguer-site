import { useEffect, useState } from "react";
import { CircleAlert, CircleCheck, UtensilsCrossed } from "lucide-react";
import styles from "./TableIdentifiedMesa.module.css";
import type { TableSession } from "../../utils/tableSessionStorage";

type TableIdentifiedMesaProps = {
  session: TableSession | null;
  expired: boolean;
};

function getRemainingMinutes(expiresAt: number) {
  return Math.max(0, Math.ceil((expiresAt - Date.now()) / 60_000));
}

export default function TableIdentifiedMesa({
  session,
  expired,
}: TableIdentifiedMesaProps) {
  const expiresAt = session?.expiresAt ?? 0;
  const [remainingMinutes, setRemainingMinutes] = useState(() =>
    getRemainingMinutes(expiresAt),
  );

  useEffect(() => {
    if (!session || expired) return;

    const updateRemaining = () => {
      setRemainingMinutes(getRemainingMinutes(expiresAt));
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") updateRemaining();
    };
    const intervalId = window.setInterval(updateRemaining, 1000);
    window.addEventListener("focus", updateRemaining);
    window.addEventListener("pageshow", updateRemaining);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", updateRemaining);
      window.removeEventListener("pageshow", updateRemaining);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [session, expired, expiresAt]);

  if (!session) {
    return null;
  }

  const isExpired = expired || remainingMinutes === 0;
  const StatusIcon = isExpired ? CircleAlert : CircleCheck;

  return (
    <section className={styles.container} aria-label="Identificação da mesa">
      <div className={`${styles.card} ${isExpired ? styles.expired : ""}`}>
        <span className={styles.icon} aria-hidden="true">
          <UtensilsCrossed size={23} />
        </span>
        <div className={styles.content}>
          <h2 className={styles.tableNumber}>
            Mesa {session.mesaId.padStart(2, "0")}
          </h2>
          <div className={styles.status} role="status">
            <StatusIcon size={14} aria-hidden="true" />
            <span>
              {isExpired
                ? "Identificação expirada — escaneie novamente o QR Code"
                : "Mesa identificada"}
            </span>
          </div>
        </div>
        {!isExpired && (
          <span
            className={styles.time}
            aria-label={`Tempo restante: ${remainingMinutes} min`}
          >
            {remainingMinutes} min
          </span>
        )}
      </div>
    </section>
  );
}
