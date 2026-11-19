import styles from "./TableIdentifiedMesa.module.css";
import { TABLE_SESSION_DURATION_MS } from "../../utils/tableSessionStorage";

type TableIdentifiedMesaProps = {
  mesaId: string | null;
};

export default function TableIdentifiedMesa({ mesaId }: TableIdentifiedMesaProps) {
  if (!mesaId) {
    return null;
  }

  return (
    <div className={styles.indicator}>
      <div className={styles.badge}>
        <div>
          <span>Número da mesa: </span>
          <strong className={styles.tableNumber}>{mesaId}</strong>
        </div>
        <span className={styles.validity}>
          Identificação válida por {TABLE_SESSION_DURATION_MS / (60 * 1000)} min após a leitura.
        </span>
      </div>
    </div>
  );
}
