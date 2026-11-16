import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { LoaderCircle, Save, User, X } from "lucide-react";
import { isAxiosError } from "axios";
import type { UserResponseDto } from "../../dtos/response/user-response.dto";
import type { UpdateUserRequestDto } from "../../dtos/request/update-user-request.dto";
import { UserService } from "../../service/user.service";
import {
  getRequestErrorMessage,
  isEmailAlreadyRegisteredError,
} from "../../utils/getRequestErrorMessage";
import {
  formatProfilePhone,
  validateProfileForm,
  type ProfileFormErrors,
} from "./profileForm";
import styles from "./EditProfileModal.module.css";

type EditProfileModalProps = {
  user: UserResponseDto;
  onClose: () => void;
  onUpdated: (user: UserResponseDto) => void;
  onAuthRequired: () => void;
};

export default function EditProfileModal({
  user,
  onClose,
  onUpdated,
  onAuthRequired,
}: EditProfileModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const savingRef = useRef(false);
  const id = useId();
  const [values, setValues] = useState<UpdateUserRequestDto>({
    name: user.name,
    email: user.email,
    phone: formatProfilePhone(user.phone),
  });
  const [errors, setErrors] = useState<ProfileFormErrors>({});
  const [requestError, setRequestError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (!dialog.open) dialog.showModal();
    dialog.focus();

    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);

  function updateField(field: keyof UpdateUserRequestDto, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setRequestError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRef.current) return;

    const nextErrors = validateProfileForm(values);
    setErrors(nextErrors);
    setRequestError("");
    const firstInvalidField = Object.keys(nextErrors)[0];
    if (firstInvalidField) {
      const input = formRef.current?.elements.namedItem(firstInvalidField);
      if (input instanceof HTMLInputElement) input.focus();
      return;
    }

    savingRef.current = true;
    setSaving(true);
    try {
      const updated = await UserService.update(user.id, {
        name: values.name.trim(),
        email: values.email.trim(),
        phone: formatProfilePhone(values.phone),
      });
      onUpdated(updated);
    } catch (error) {
      if (isEmailAlreadyRegisteredError(error)) {
        setErrors({ email: "Este e-mail já está em uso. Informe outro." });
      } else if (isAxiosError(error) && error.response?.status === 401) {
        onAuthRequired();
      } else {
        setRequestError(
          getRequestErrorMessage(error, "Não foi possível atualizar o perfil. Tente novamente."),
        );
      }
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      tabIndex={-1}
      className={styles.dialog}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
      aria-busy={saving}
      onCancel={(event) => {
        event.preventDefault();
        if (!savingRef.current) onClose();
      }}
    >
      <header className={styles.header}>
        <span className={styles.icon}><User size={23} aria-hidden="true" /></span>
        <div>
          <h2 id={`${id}-title`}>Editar perfil</h2>
          <p id={`${id}-description`}>Mantenha suas informações atualizadas.</p>
        </div>
        <button
          className={styles.close}
          type="button"
          aria-label="Fechar edição do perfil"
          disabled={saving}
          onClick={onClose}
        >
          <X size={19} aria-hidden="true" />
        </button>
      </header>

      <form ref={formRef} className={styles.form} noValidate onSubmit={handleSubmit}>
        <fieldset className={styles.fields} disabled={saving}>
          <label className={styles.field}>
            <span>Nome completo</span>
            <input
              name="name"
              value={values.name}
              onChange={(event) => updateField("name", event.target.value)}
              autoComplete="name"
              required
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? `${id}-name-error` : undefined}
            />
            {errors.name && <small id={`${id}-name-error`} className={styles.fieldError}>{errors.name}</small>}
          </label>
          <label className={styles.field}>
            <span>E-mail</span>
            <input
              name="email"
              type="email"
              value={values.email}
              onChange={(event) => updateField("email", event.target.value)}
              autoComplete="email"
              required
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? `${id}-email-error` : undefined}
            />
            {errors.email && <small id={`${id}-email-error`} className={styles.fieldError}>{errors.email}</small>}
          </label>
          <label className={styles.field}>
            <span>Telefone</span>
            <input
              name="phone"
              type="tel"
              inputMode="tel"
              value={values.phone}
              onChange={(event) => updateField("phone", formatProfilePhone(event.target.value))}
              autoComplete="tel-national"
              placeholder="(64) 99999-9999"
              required
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? `${id}-phone-error` : undefined}
            />
            {errors.phone && <small id={`${id}-phone-error`} className={styles.fieldError}>{errors.phone}</small>}
          </label>
        </fieldset>
        {requestError && <p className={styles.requestError} role="alert">{requestError}</p>}
        <footer className={styles.actions}>
          <button type="button" className={styles.cancel} onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="submit" className={styles.save} disabled={saving}>
            {saving ? (
              <LoaderCircle size={17} className={styles.spinner} aria-hidden="true" />
            ) : <Save size={17} aria-hidden="true" />}
            {saving ? "Atualizando..." : "Atualizar"}
          </button>
        </footer>
      </form>
    </dialog>
  );
}
