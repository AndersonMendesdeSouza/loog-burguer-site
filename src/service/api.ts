import axios from "axios";

// export const API_BASE_URL =
//   import.meta.env.VITE_API_URL ||
//   (import.meta.env.DEV
//     ? "http://localhost:3000"
//     : "https://burguer-api-production.up.railway.app");

export const API_BASE_URL = "https://burguer-api-production.up.railway.app"
const api = axios.create({
  baseURL: API_BASE_URL,
});

export const SESSION_EXPIRED_EVENT = "auth:session-expired";

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token && !config.headers.has("X-Order-Token")) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const token = localStorage.getItem("token");
      const request = error.config;

      // Uma resposta antiga ou um token de pedido não deve encerrar a sessão atual.
      if (
        token &&
        request?.headers.get("Authorization") === `Bearer ${token}` &&
        !request.headers.has("X-Order-Token") &&
        request.url !== "/users/login"
      ) {
        localStorage.removeItem("token");
        localStorage.removeItem("userId");
        window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
      }
    }

    return Promise.reject(error);
  },
);

export default api;
