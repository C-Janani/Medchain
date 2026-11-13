// API base comes from demo.js: same origin in production ("/api"), "/api/demo" in public demo mode.

const Auth = {
  saveSession(token, user) {
    localStorage.removeItem("rxchain_demo"); // a real login always leaves demo mode
    localStorage.setItem("rxchain_token", token);
    localStorage.setItem("rxchain_user", JSON.stringify(user));
  },

  getToken() {
    return localStorage.getItem("rxchain_token");
  },

  getUser() {
    const raw = localStorage.getItem("rxchain_user");
    return raw ? JSON.parse(raw) : null;
  },

  logout() {
    if (RxDemo.isDemo()) { RxDemo.exit(); return; }
    localStorage.removeItem("rxchain_token");
    localStorage.removeItem("rxchain_user");
    window.location.href = "../../login.html";
  },

  requireRole(role) {
    const user = Auth.getUser();

    if (!user || !Auth.getToken() || user.role !== role) {
      window.location.href = "../../login.html";
      return null;
    }

    return user;
  },
};

async function api(path, options = {}) {
  const { method = "GET", body = null } = options;

  const headers = {};
  if (body !== null) headers["Content-Type"] = "application/json";

  const token = Auth.getToken();
  if (token && !RxDemo.isDemo()) headers.Authorization = `Bearer ${token}`;

  const API_BASE = RxDemo.apiBase();
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body !== null ? JSON.stringify(body) : undefined,
    });
  } catch (networkError) {
    // This is what the browser reports as "Failed to fetch"
    throw new Error("Cannot reach the server. Check your connection and try again.");
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Request failed (${response.status})`);
  }

  return data;
}
