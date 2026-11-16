import { useEffect, useId, useRef } from "react";
import { Link } from "react-router-dom";
import { LogIn, UserRound, UserRoundPlus, X } from "lucide-react";
import styles from "./AuthRequiredModal.module.css";

type AuthRequiredModalProps = {
  description?: string;
  onClose: () => void;
};

export default function AuthRequiredModal({
  description = "Entre na sua conta ou cadastre-se para acessar seu perfil e salvar seus endereços.",
  onClose,
}: AuthRequiredModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const loginRef = useRef<HTMLAnchorElement>(null);
  const id = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (!dialog.open) dialog.showModal();
    loginRef.current?.focus();

    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus();
      }
    };
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <button className={styles.close} type="button" onClick={onClose} aria-label="Fechar">
        <X size={19} aria-hidden="true" />
      </button>
      <div className={styles.icon}><UserRound size={26} aria-hidden="true" /></div>
      <h2 id={`${id}-title`}>Entre para continuar</h2>
      <p id={`${id}-description`}>{description}</p>
      <div className={styles.actions}>
        <Link ref={loginRef} className={styles.login} to="/login">
          <LogIn size={18} aria-hidden="true" />Entrar
        </Link>
        <Link className={styles.register} to="/register">
          <UserRoundPlus size={18} aria-hidden="true" />Criar conta
        </Link>
      </div>
      <button className={styles.later} type="button" onClick={onClose}>Agora não</button>
    </dialog>
  );
}
