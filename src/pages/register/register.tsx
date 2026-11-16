import { useState, type CSSProperties } from "react";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Hamburger,
  LockKeyhole,
  Mail,
  Phone,
  UserRound,
  UserRoundPlus,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import Colors from "../../themes/Colors";
import styles from "../login/login.module.css";
import registerStyles from "./register.module.css";
import { UserService } from "../../service/user.service";
import type { UserRequestDto } from "../../dtos/request/user-request.dto";
import { UserRole } from "../../dtos/enums/user-role.enum";
import {
  getRequestErrorMessage,
  isEmailAlreadyRegisteredError,
} from "../../utils/getRequestErrorMessage";
import type { LoginRequestDto } from "../../dtos/request/login-request.dto";
import { useAuth } from "../../contexts/AuthContext";

type RegisterCssVars = CSSProperties & {
  "--bg-primary": string;
  "--bg-secondary": string;
  "--text-primary": string;
  "--text-secondary": string;
  "--highlight": string;
};

type RegisterErrors = Partial<
  Record<"name" | "email" | "phone" | "password", string>
>;

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);

  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;

  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function RegisterBrand() {
  return (
    <Link className={styles.brand} to="/main" aria-label="Burguer — início">
      <Hamburger aria-hidden="true" />
      <span className={styles.brandText}>
        <span className={styles.brandName}>Burguer</span>
        <span className={styles.brandSubtitle}>Hamburgueria</span>
      </span>
    </Link>
  );
}

export default function Register() {
  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const navigate = useNavigate();
  const { login: contextLogin } = useAuth();
  function validateFields(): boolean {
    const nextErrors: RegisterErrors = {};

    if (!name.trim()) nextErrors.name = "Nome precisa ser preenchido.";
    if (!email.trim()) nextErrors.email = "E-mail precisa ser preenchido.";
    if (!phone.trim()) nextErrors.phone = "Telefone precisa ser preenchido.";
    if (!password.trim()) nextErrors.password = "Senha precisa ser preenchida.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function newUser(): Promise<void> {
    if (isSubmitting) return;
    if (!validateFields()) return;

    const payload: UserRequestDto = {
      name: name.trim(),
      email: email.trim(),
      phone,
      role: UserRole.CUSTOMER,
      password,
    };

    setIsSubmitting(true);

    try {
      await UserService.register(payload);
      const payloadLogin: LoginRequestDto = {
        email: email.trim(),
        password,
      };
      const data = await UserService.login(payloadLogin);
      contextLogin(data.token);
      localStorage.setItem("token", data.token);
      localStorage.setItem("userId", data.user.id);
      navigate("/main");
    } catch (error) {
      console.error(error);
      const isEmailAlreadyRegistered = isEmailAlreadyRegisteredError(error);

      if (isEmailAlreadyRegistered) {
        setErrors((current) => ({
          ...current,
          email: "Esse e-mail já está cadastrado.",
        }));
      }

      toast.error(
        <div className={styles.toastContent}>
          <strong className={styles.toastTitle}>
            {isEmailAlreadyRegistered
              ? "E-mail já cadastrado"
              : "Não foi possível criar sua conta"}
          </strong>
          <span className={styles.toastMessage}>
            {isEmailAlreadyRegistered
              ? "Você já tem uma conta com esse e-mail. Tente entrar ou use outro endereço."
              : getRequestErrorMessage(
                  error,
                  "Confira os dados informados e tente novamente.",
                )}
          </span>
        </div>,
        {
          autoClose: 3600,
          position: "top-center",
          theme: "dark",
        },
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main
      className={styles.screen}
      style={
        {
          "--bg-primary": Colors.Background.primary,
          "--bg-secondary": Colors.Background.secondary,
          "--text-primary": Colors.Texts.primary,
          "--text-secondary": Colors.Texts.secondary,
          "--highlight": Colors.Highlight.primary,
        } as RegisterCssVars
      }
    >
      <header className={styles.siteHeader}>
        <div className={styles.headerInner}>
          <RegisterBrand />
          <nav className={styles.navigation} aria-label="Navegação principal">
            <Link to="/main">Início</Link>
            <Link to="/pedidos">Pedidos</Link>
            <Link to="/perfil">Perfil</Link>
          </nav>
        </div>
      </header>

      <section className={`${styles.card} ${registerStyles.card}`} data-enter="page" aria-labelledby="register-title">
        <div className={`${styles.hero} ${registerStyles.hero}`}>
          <div className={styles.welcome}>
            <h1 id="register-title">
              <span>Crie sua</span>
              <span className={styles.welcomeAccent}>conta!</span>
            </h1>
            <p>Entre para o clube Burguer e peça<br />seus hambúrgueres favoritos.</p>
          </div>
        </div>

        <div className={`${styles.content} ${registerStyles.content}`}>
          <div className={styles.formBrand}><RegisterBrand /></div>
          <div className={registerStyles.formScroll}>
            <Link className={registerStyles.backLink} to="/login">
              <ArrowLeft size={16} aria-hidden="true" />
              Voltar para o login
            </Link>

            <form
              className={styles.form}
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                newUser();
              }}
            >
              <label className={styles.fieldGroup}>
                <span className={styles.label}>Nome completo</span>
                <span
                  className={`${styles.inputShell} ${
                    errors.name ? styles.inputError : ""
                  }`}
                >
                  <UserRound size={20} aria-hidden="true" />
                  <input
                    type="text"
                    placeholder="Digite seu nome"
                    autoComplete="name"
                    value={name}
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? "name-error" : undefined}
                    onChange={(e) => {
                      setName(e.target.value);
                      setErrors((current) => ({ ...current, name: undefined }));
                    }}
                  />
                </span>
                {errors.name && (
                  <span className={styles.errorText} id="name-error">
                    {errors.name}
                  </span>
                )}
              </label>

              <label className={styles.fieldGroup}>
                <span className={styles.label}>E-mail</span>
                <span
                  className={`${styles.inputShell} ${
                    errors.email ? styles.inputError : ""
                  }`}
                >
                  <Mail size={20} aria-hidden="true" />
                  <input
                    type="email"
                    placeholder="nome@exemplo.com"
                    autoComplete="email"
                    value={email}
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? "email-error" : undefined}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setErrors((current) => ({ ...current, email: undefined }));
                    }}
                  />
                </span>
                {errors.email && (
                  <span className={styles.errorText} id="email-error">
                    {errors.email}
                  </span>
                )}
              </label>

              <label className={styles.fieldGroup}>
                <span className={styles.label}>Telefone</span>
                <span
                  className={`${styles.inputShell} ${
                    errors.phone ? styles.inputError : ""
                  }`}
                >
                  <Phone size={20} aria-hidden="true" />
                  <input
                    type="tel"
                    placeholder="(00) 00000-0000"
                    autoComplete="tel"
                    value={phone}
                    maxLength={15}
                    aria-invalid={!!errors.phone}
                    aria-describedby={errors.phone ? "phone-error" : undefined}
                    onChange={(e) => {
                      setPhone(formatPhone(e.target.value));
                      setErrors((current) => ({ ...current, phone: undefined }));
                    }}
                  />
                </span>
                {errors.phone && (
                  <span className={styles.errorText} id="phone-error">
                    {errors.phone}
                  </span>
                )}
              </label>

              <label className={styles.fieldGroup}>
                <span className={styles.label}>Senha</span>
                <span
                  className={`${styles.inputShell} ${
                    errors.password ? styles.inputError : ""
                  }`}
                >
                  <LockKeyhole size={20} aria-hidden="true" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="........"
                    autoComplete="new-password"
                    value={password}
                    aria-invalid={!!errors.password}
                    aria-describedby={
                      errors.password ? "password-error" : undefined
                    }
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrors((current) => ({
                        ...current,
                        password: undefined,
                      }));
                    }}
                  />
                  <button
                    className={styles.iconButton}
                    type="button"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </span>
                {errors.password && (
                  <span className={styles.errorText} id="password-error">
                    {errors.password}
                  </span>
                )}
              </label>

              <button
                className={styles.submitButton}
                type="submit"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? (
                  <span className={styles.loadingSpinner} aria-hidden="true" />
                ) : (
                  <><UserRoundPlus size={21} aria-hidden="true" /><span>Criar conta</span></>
                )}
              </button>
            </form>

            <p className={styles.signupText}>
              Já tem uma conta? <Link to="/login">Entrar</Link>
            </p>

            <p className={registerStyles.termsText}>
              Ao clicar em Criar conta, você concorda com os Termos de Serviço e a
              Política de Privacidade do Burguer.
            </p>
          </div>
        </div>
      </section>
      <ToastContainer position="top-center" />
    </main>
  );
}
