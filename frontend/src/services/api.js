/**
 * BCC SmartConnect — Frontend API Client
 * Connects to the Express backend via REST + Socket.io (not Supabase SDK)
 * Base URL is controlled by VITE_API_URL environment variable.
 */

import { io } from 'socket.io-client';
import { initialIncidents, fieldTeams as mockTeams } from '../data/mockData';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// ─── Token helpers (stored in sessionStorage for the admin portal) ─────────────
function getToken() {
  return sessionStorage.getItem('bcc_token');
}
function setToken(token) {
  if (token) sessionStorage.setItem('bcc_token', token);
  else sessionStorage.removeItem('bcc_token');
}
function setUser(user) {
  if (user) sessionStorage.setItem('bcc_user', JSON.stringify(user));
  else sessionStorage.removeItem('bcc_user');
}
export function getSavedUser() {
  try {
    const raw = sessionStorage.getItem('bcc_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ─── Auth-aware fetch wrapper ─────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Mock bulletins for offline/dev fallback ─────────────────────────────────
const mockBulletins = [
  {
    id: 'b-1',
    title: 'Criterion Water Works Maintenance',
    body: 'Scheduled water supply reduction in Eastern suburbs between 08:00 and 17:00 tomorrow due to valve rehabilitation.',
    category: 'Water Cut',
    target_ward: 'Eastern Suburbs',
    is_urgent: true,
    created_at: new Date().toISOString(),
  },
  {
    id: 'b-2',
    title: 'Luveve Road Resurfacing Update',
    body: 'Asphalt paving along Luveve Road near Mpilo Hospital is progressing. Single lane traffic diversions in place.',
    category: 'Roads',
    target_ward: 'Luveve & Magwegwe',
    is_urgent: false,
    created_at: new Date().toISOString(),
  },
];

// ─── Socket.io singleton for realtime dispatch updates ─────────────────────────
let _socket = null;
function getSocket() {
  if (_socket) return _socket;
  const token = getToken();
  _socket = io(API_BASE, {
    transports: ['websocket', 'polling'],
    auth: { token: token || '' },
    query: { room: 'admin' },
    autoConnect: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  });
  _socket.on('connect', () => console.log('[Socket.io] Connected to BCC backend'));
  _socket.on('disconnect', (reason) => console.warn('[Socket.io] Disconnected:', reason));
  _socket.on('connect_error', (err) => console.warn('[Socket.io] Connect error:', err.message));
  return _socket;
}

// ─── Main API object ─────────────────────────────────────────────────────────
export const bccApi = {
  // Check if backend is reachable
  async isReachable() {
    try {
      await fetch(`${API_BASE}/health`);
      return true;
    } catch {
      return false;
    }
  },

  // ── Auth ────────────────────────────────────────────────────────────────────
  async login(email, password) {
    const data = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setToken(data.access);
    setUser(data.user);
    return data;
  },

  async register(first_name, last_name, email, password, phone) {
    const data = await apiFetch('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ first_name, last_name, email, password, phone }),
    });
    setToken(data.access);
    setUser(data.user);
    return data;
  },

  async loginAsGuest() {
    const data = await apiFetch('/api/auth/guest', { method: 'POST' });
    setToken(data.access);
    setUser(data.user);
    return data;
  },

  logout() {
    setToken(null);
    setUser(null);
    if (_socket) {
      _socket.disconnect();
      _socket = null;
    }
  },

  // ── Incidents ──────────────────────────────────────────────────────────────
  async getIncidents() {
    try {
      const data = await apiFetch('/api/incidents');
      return Array.isArray(data) && data.length > 0 ? data : initialIncidents;
    } catch (err) {
      console.warn('getIncidents fallback to mock:', err.message);
      return initialIncidents;
    }
  },

  async updateIncident(id, updates) {
    try {
      return await apiFetch(`/api/incidents/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
    } catch (err) {
      console.error('updateIncident failed:', err.message);
      return updates;
    }
  },

  async getIncidentByRef(reference) {
    try {
      return await apiFetch(`/api/incidents/track/${reference}`);
    } catch (err) {
      console.error('getIncidentByRef failed:', err.message);
      return null;
    }
  },

  async reportIncident(payload) {
    return apiFetch('/api/incidents', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // ── Field Teams ────────────────────────────────────────────────────────────
  async getFieldTeams() {
    try {
      const data = await apiFetch('/api/teams');
      return Array.isArray(data) && data.length > 0 ? data : mockTeams;
    } catch (err) {
      console.warn('getFieldTeams fallback to mock:', err.message);
      return mockTeams;
    }
  },

  async updateTeam(id, updates) {
    return apiFetch(`/api/teams/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  },

  // ── Bulletins ──────────────────────────────────────────────────────────────
  async getBulletins() {
    try {
      const data = await apiFetch('/api/bulletins');
      return Array.isArray(data) && data.length > 0 ? data : mockBulletins;
    } catch (err) {
      console.warn('getBulletins fallback to mock:', err.message);
      return mockBulletins;
    }
  },

  async createBulletin(bulletin) {
    try {
      return await apiFetch('/api/bulletins', {
        method: 'POST',
        body: JSON.stringify(bulletin),
      });
    } catch (err) {
      console.error('createBulletin failed:', err.message);
      return { id: `b-${Date.now()}`, ...bulletin, created_at: new Date().toISOString() };
    }
  },

  // ── Real-time Socket.io subscriptions ─────────────────────────────────────
  subscribeToChanges({ onNewIncident, onUpdateIncident, onNewBulletin, onTeamUpdate }) {
    const socket = getSocket();

    if (onNewIncident) {
      socket.on('incident:new', onNewIncident);
    }
    if (onUpdateIncident) {
      socket.on('incident:update', onUpdateIncident);
    }
    if (onNewBulletin) {
      socket.on('bulletin:new', onNewBulletin);
    }
    if (onTeamUpdate) {
      socket.on('team:update', onTeamUpdate);
    }

    // Return cleanup function
    return () => {
      socket.off('incident:new', onNewIncident);
      socket.off('incident:update', onUpdateIncident);
      socket.off('bulletin:new', onNewBulletin);
      socket.off('team:update', onTeamUpdate);
    };
  },
};
