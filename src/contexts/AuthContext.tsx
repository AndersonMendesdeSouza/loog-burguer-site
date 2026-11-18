/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";
import api, { SESSION_EXPIRED_EVENT } from "../service/api";

type AuthContextType = {
  isAuthenticated: boolean;
  login: (token: string) => void;
  logout: () => void;
  loading: boolean;
};

const AuthContext = createContext({} as AuthContextType);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => Boolean(localStorage.getItem("token")),
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    let validating = false;

    function handleSessionExpired() {
      setIsAuthenticated(false);
      setLoading(false);
    }

    async function validateToken() {
      if (!active || validating) return;
      const token = localStorage.getItem("token");

      if (!token) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }

      validating = true;
      try {
        await api.get("/users/me");
        if (active && localStorage.getItem("token") === token) {
          setIsAuthenticated(true);
        }
      } catch {
        // O interceptor encerra a sessão no 401. Falhas de rede preservam o login.
      } finally {
        validating = false;
        if (active) setLoading(false);
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") void validateToken();
    }

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    window.addEventListener("focus", validateToken);
    window.addEventListener("pageshow", validateToken);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    void validateToken();

    return () => {
      active = false;
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
      window.removeEventListener("focus", validateToken);
      window.removeEventListener("pageshow", validateToken);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  function login(token: string) {
    localStorage.setItem("token", token);
    setIsAuthenticated(true);
    setLoading(false);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    setIsAuthenticated(false);
  }

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, login, logout, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
