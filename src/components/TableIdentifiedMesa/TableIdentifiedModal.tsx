import { useEffect, useId, useRef } from "react";
import { CircleAlert, CircleCheck } from "lucide-react";
import styles from "./TableIdentifiedModal.module.css";

type TableIdentifiedModalProps = {
  tableNumber: string;
  title?: string;
  description?: string;
  closeLabel?: string;
  confirmLabel?: string;
  isConfirming?: boolean;
  expired?: boolean;
  onConfirm?: () => void;
  onClose: () => void;
};

export default function TableIdentifiedModal({
  tableNumber,
  title = "Mesa identificada",
  description = "Sua identificação da mesa é válida por 20 minutos a partir da leitura da plaquinha. Após esse prazo, aproxime o telefone ou escaneie o QR Code novamente para fazer outro pedido na mesa.",
  closeLabel = "Fechar",
  confirmLabel = "Confirmar pedido",
  isConfirming = false,
  expired = false,
  onConfirm,
  onClose,
}: TableIdentifiedModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const Icon = expired ? CircleAlert : CircleCheck;

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();

    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className={styles.modal}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        if (!isConfirming) onClose();
      }}
      aria-busy={isConfirming}
    >
      <span className={styles.icon} aria-hidden="true">
        <Icon size={28} />
      </span>
      <h2 id={titleId}>{title}</h2>
      <p className={styles.tableNumber}>
        Mesa {tableNumber}
      </p>
      <p id={descriptionId} className={styles.hint}>
        {description}
      </p>
      <div className={styles.actions}>
        <button
          type="button"
          className={`${styles.closeButton} ${onConfirm ? styles.cancelButton : ""}`}
          disabled={isConfirming}
          onClick={onClose}
        >
          {closeLabel}
        </button>
        {onConfirm && (
          <button
            type="button"
            className={styles.closeButton}
            disabled={isConfirming}
            onClick={onConfirm}
          >
            {isConfirming ? "Enviando..." : confirmLabel}
          </button>
        )}
      </div>
    </dialog>
  );
}
