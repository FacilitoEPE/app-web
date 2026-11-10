import axios from "axios";
import { clearSession, getAuthToken } from "@/shared/offline/session";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "/api" : ""),
  headers: {
    "Cache-Control": "no-store",
    Pragma: "no-cache",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  else delete config.headers.Authorization;
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    if (typeof response.data === "string" && response.data.trim().toLowerCase().startsWith("<!doctype html>")) {
      return Promise.reject(new Error("El servidor no respondió datos válidos (API no conectada)."));
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401 && !String(error.config?.url ?? '').includes('/auth/login')) {
      clearSession();
      window.dispatchEvent(new Event('epe:auth-expired'));
    }
    return Promise.reject(error.response?.data ?? error);
  },
);
