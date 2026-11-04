import { hc } from 'hono/client';
import type { AppType } from '../../../api/src/index';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = hc<AppType>(API_URL, {
  headers: (): Record<string, string> => {
    const headers: Record<string, string> = {};
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('feedbackpulse_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    return headers;
  },
});

export const client = api;
