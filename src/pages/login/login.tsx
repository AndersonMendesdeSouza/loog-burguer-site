import { useState, type CSSProperties } from "react";
import { Eye, EyeOff, Flame, Hamburger, LockKeyhole, LogIn, Mail, ShieldCheck, Zap } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import Colors from "../../themes/Colors";
import styles from "./login.module.css";
import { UserService } from "../../service/user.service";
import type { LoginRequestDto } from "../../dtos/request/login-request.dto";
import { getRequestErrorMessage } from "../../utils/getRequestErrorMessage";
import { useAuth } from "../../contexts/AuthContext";

type LoginCssVars = CSSProperties & {
  "--bg-primary": string;
  "--bg-secondary": string;
  "--text-primary": string;
  "--text-secondary": string;
  "--highlight": string;
};

type LoginErrors = Partial<Record<"email" | "password", string>>;

function LoginBrand() {
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

export default function Login() {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const { login: contextLogin } = useAuth();

  const navigate = useNavigate();

  function validateFields(): boolean {
    const nextErrors: LoginErrors = {};

    if (!email.trim()) nextErrors.email = "E-mail precisa ser preenchido.";
    if (!password.trim()) nextErrors.password = "Senha precisa ser preenchida.";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function login(): Promise<void> {
    if (isSubmitting) return;
    if (!validateFields()) return;

    const payload: LoginRequestDto = {
      email: email.trim(),
      password,
    };

    setIsSubmitting(true);

    try {
      const response = await UserService.login(payload);
      contextLogin(response.token);
      localStorage.setItem("token", response.token);
      localStorage.setItem("userId", response.user.id);
      navigate("/main");
    } catch (error) {
      console.error(error);
      toast.error(
        <div className={styles.toastContent}>
          <strong className={styles.toastTitle}>Não foi possível entrar</strong>
          <span className={styles.toastMessage}>
            {getRequestErrorMessage(
              error,
              "Confira seus dados e tente novamente.",
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
        } as LoginCssVars
      }
    >
      <header className={styles.siteHeader}>
        <div className={styles.headerInner}>
          <LoginBrand />
          <nav className={styles.navigation} aria-label="Navegação principal">
            <Link to="/main">Início</Link>
            <Link to="/pedidos">Pedidos</Link>
            <Link to="/perfil">Perfil</Link>
          </nav>
        </div>
      </header>

      <section className={styles.card} data-enter="page" aria-labelledby="login-title">
        <div className={styles.hero}>
          <div className={styles.welcome}>
            <h1 id="login-title">
              <span>Bem-vindo</span>
              <span className={styles.welcomeAccent}>de volta!</span>
            </h1>
            <p>Acesse sua conta para continuar<br />pedindo seus hambúrgueres favoritos.</p>
          </div>
          <img
            className={styles.heroImage}
            src="/login-banner-mobile.png"
            alt="Hambúrguer artesanal com queijo, bacon, batatas e refrigerante"
            width="941"
            height="1672"
            fetchPriority="high"
          />
        </div>

        <div className={styles.content}>
          <div className={styles.formBrand}><LoginBrand /></div>
          <div className={styles.formScroll}>

            <form
              className={styles.form}
              noValidate
              onSubmit={(event) => {
                event.preventDefault();
                login();
              }}
            >
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
                    autoComplete="current-password"
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

              <Link className={styles.forgotLink} to="/login">
                Esqueceu a senha?
              </Link>

              <button
                className={styles.submitButton}
                type="submit"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting ? (
                  <span className={styles.loadingSpinner} aria-hidden="true" />
                ) : (
                  <><LogIn size={21} aria-hidden="true" /><span>Entrar</span></>
                )}
              </button>
            </form>

            <p className={styles.signupText}>
              Novo no Burguer? <Link to="/register">Criar conta</Link>
            </p>
          </div>
        </div>

        <ul className={styles.benefits} aria-label="Sobre o Burguer">
          <li><Hamburger aria-hidden="true" /><span>Cardápio<br />completo</span></li>
          <li><Zap aria-hidden="true" /><span>Pedidos<br />rápidos</span></li>
          <li><Flame aria-hidden="true" /><span>Sabor<br />artesanal</span></li>
          <li><ShieldCheck aria-hidden="true" /><span>Qualidade<br />garantida</span></li>
        </ul>
      </section>
      <ToastContainer position="top-center" />
    </main>
  );
}
