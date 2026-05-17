// ─── CertifyPro API Client ────────────────────────────────────────────────────
// Local dev: Vite proxies `/api` → `localhost:5000`.
// Production (Netlify): set `VITE_API_URL` to your Render API base, e.g.
//   https://thecertifypro-backend.onrender.com/api
const BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

// Token helpers
export const getToken = () => localStorage.getItem('cp_token');
export const setToken = (t) => localStorage.setItem('cp_token', t);
export const clearToken = () => localStorage.removeItem('cp_token');

// Core fetch wrapper
async function request(method, path, body, isFormData = false) {

  const token = getToken();
  const headers = {};

  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (body && !isFormData) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });

  // Be resilient to non-JSON responses (eg. proxies / HTML errors)
  let data = {};
  const text = await res.text().catch(() => '');
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = {};
    }
  }

  if (res.status === 401) {
    const errMsg = (data.error || '').toLowerCase();
    if (
      errMsg.includes('user not found') ||
      errMsg.includes('invalid token') ||
      errMsg.includes('no token') ||
      errMsg.includes('token expired')
    ) {
      clearToken();
      localStorage.removeItem('cp_user');
      window.dispatchEvent(new Event('cp:auth-error'));
    }
    throw new Error(data.error || `Unauthorized (${res.status})`);
  }

  if (!res.ok) {
    const msg =
      data.error ||
      data.message ||
      (text.includes('Too many') ? 'Rate limit exceeded' : `Server Error (${res.status})`);
    throw new Error(msg);
  }

  return data;
}

const get = (path) => request('GET', path);
const post = (path, body) => request('POST', path, body);
const put = (path, body) => request('PUT', path, body);
const del = (path) => request('DELETE', path);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const auth = {
  register: (data) => post('/auth/register', data),
  login: (data) => post('/auth/login', data),
  me: () => get('/auth/me'),
  forgotPassword: (email) => post('/auth/forgot-password', { email }),
  resetPassword: (data) => post('/auth/reset-password', data),
  changePassword: (data) => put('/auth/change-password', data),
};

// ── Certificates ──────────────────────────────────────────────────────────────
export const certificates = {
  list: (params = {}) => get('/certificates?' + new URLSearchParams(params).toString()),
  stats: () => get('/certificates/stats'),
  get: (id) => get(`/certificates/${id}`),
  create: (data) => post('/certificates', data),
  bulk: (data) => post('/certificates/bulk', data),
  update: (id, data) => put(`/certificates/${id}`, data),
  delete: (id) => del(`/certificates/${id}`),
};

// ── Users ─────────────────────────────────────────────────────────────────────
export const users = {
  profile: () => get('/users/profile'),
  update: (data) => put('/users/profile', data),
  upgrade: () => post('/users/upgrade', {}),
  deleteAccount: () => del('/users/account'),
};

// ── Payments ──────────────────────────────────────────────────────────────────
export const payments = {
  submit: (data) => post('/payments', data),
  list: () => get('/payments/all'),
  approve: (paymentId) => post('/payments/approve', { paymentId }),
  reject: (paymentId) => post('/payments/reject', { paymentId }),
  checkStatus: () => get('/payments/status'),
  generateId: () => get('/payments/generate-id'),
};

// ── Verify ────────────────────────────────────────────────────────────────────
export const verify = {
  check: (certId) => get(`/verify/${certId}`),
};

// ── Uploads ───────────────────────────────────────────────────────────────────
export const uploads = {
  image: async (file) => {
    const form = new FormData();
    form.append('file', file);
    return request('POST', '/uploads/image', form, true);
  },
  delete: (filename) => del(`/uploads/${filename}`),
};

export default { auth, certificates, users, verify, uploads, payments };
