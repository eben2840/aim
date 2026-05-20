// ─── Base API Client ──────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "https://abitrack-9aa35a0b4b27.herokuapp.com/api/v1";

function getAuthToken(): string | null {
  return localStorage.getItem("abitrack_token");
}

function clearAuth() {
  localStorage.removeItem("abitrack_token");
  localStorage.removeItem("abitrack_user");
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, headers, ...rest } = options;

  const url = new URL(`${BASE_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined) url.searchParams.set(k, String(v));
    });
  }

  const token = getAuthToken();
  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(headers as Record<string, string>),
  };

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      ...rest,
      headers: defaultHeaders,
    });
  } catch {
    throw new Error("Could not connect to the server. Please try again in a moment.");
  }

  // Token is invalid/expired — clear it and redirect to login
  if (response.status === 401 || response.status === 422) {
    clearAuth();
    window.location.href = "/abitrack/signin";
    throw new Error("Session expired. Please sign in again.");
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message ?? `Request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}

export async function uploadFile<T>(endpoint: string, file: File, extraFields?: Record<string, string>): Promise<T> {
  const token = getAuthToken();
  const formData = new FormData();
  formData.append("file", file);
  if (extraFields) {
    Object.entries(extraFields).forEach(([k, v]) => formData.append(k, v));
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${endpoint}`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
  } catch {
    throw new Error("Could not connect to the server. Please try again in a moment.");
  }

  if (response.status === 401 || response.status === 422) {
    clearAuth();
    window.location.href = "/abitrack/signin";
    throw new Error("Session expired. Please sign in again.");
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message ?? "Upload failed");
  }

  return response.json() as Promise<T>;
}

export const api = {
  get: <T>(endpoint: string, params?: RequestOptions["params"]) =>
    request<T>(endpoint, { method: "GET", params }),
  post: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(endpoint: string, body?: unknown) =>
    request<T>(endpoint, { method: "PATCH", body: JSON.stringify(body) }),
  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: "DELETE" }),
};

export default api;
