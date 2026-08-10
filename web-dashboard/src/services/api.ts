/**
 * HostelConnect Centralized Production API Service
 */

const API_BASE_URL =
  (import.meta as any).env?.VITE_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:4000/api/v1'
    : 'https://hostelconnect-backend.onrender.com/api/v1');

function getAuthToken(): string | null {
  try {
    const raw = localStorage.getItem('hostelconnect_user_session');
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.token || null;
    }
  } catch (e) {
    // Ignore parse error
  }
  return null;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const errorMsg = data?.message || (Array.isArray(data?.message) ? data.message.join(', ') : 'API request failed');
      throw new Error(errorMsg);
    }

    return data as T;
  } catch (err: any) {
    console.error(`[API Error] ${options.method || 'GET'} ${url}:`, err);
    throw err;
  }
}

export const api = {
  // ─── Authentication ───
  auth: {
    login: (identifier: string, password: string) =>
      request<{ user: any; accessToken: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password }),
      }),

    register: (payload: { fullName: string; email: string; phoneNumber: string; password: string; role: string; schoolCode?: string }) =>
      request<{ user: any; accessToken: string }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),

    forgotPassword: (email: string) =>
      request<{ success: boolean; message: string; refId: string; expiresInMinutes: number; recipient: string }>(
        '/auth/forgot-password',
        {
          method: 'POST',
          body: JSON.stringify({ email }),
        },
      ),


    verifyResetToken: (token: string) =>
      request<{ valid: boolean; email: string; expiresAt: string }>('/auth/verify-reset-token', {
        method: 'POST',
        body: JSON.stringify({ token }),
      }),

    resetPassword: (token: string, newPassword: string) =>
      request<{ success: boolean; message: string }>('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword }),
      }),

    getProfile: () => request<any>('/auth/me'),
  },

  // ─── Schools / Tenants ───
  schools: {
    getAll: () => request<any[]>('/schools'),
    getById: (id: string) => request<any>(`/schools/${id}`),
    create: (data: { name: string; code: string; plan?: string }) =>
      request<any>('/schools', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    toggleStatus: (id: string) =>
      request<any>(`/schools/${id}/status`, {
        method: 'PATCH',
      }),
  },

  // ─── Students ───
  students: {
    getAll: (schoolCode?: string, search?: string) => {
      const params = new URLSearchParams();
      if (schoolCode) params.set('schoolCode', schoolCode);
      if (search) params.set('search', search);
      return request<any[]>(`/students?${params.toString()}`);
    },
    create: (data: { name: string; code: string; room?: string; grade?: string; schoolCode?: string; parent?: string }) =>
      request<any>('/students', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    resetPin: (id: string) =>
      request<{ id: string; name: string; pin: string }>(`/students/${id}/reset-pin`, {
        method: 'POST',
      }),
    bulkImport: (schoolCode: string, items?: any[]) =>
      request<any[]>('/students/import-excel', {
        method: 'POST',
        body: JSON.stringify({ schoolCode, items }),
      }),
  },

  // ─── Parents ───
  parents: {
    getAll: (schoolCode?: string) => {
      const params = new URLSearchParams();
      if (schoolCode) params.set('schoolCode', schoolCode);
      return request<any[]>(`/parents?${params.toString()}`);
    },
    create: (data: { name: string; phone: string; student: string; relationship?: string; schoolCode?: string }) =>
      request<any>('/parents', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    approve: (id: string) =>
      request<any>(`/parents/${id}/approve`, {
        method: 'PATCH',
      }),
  },

  // ─── Tablets ───
  tablets: {
    getAll: (schoolCode?: string) => {
      const params = new URLSearchParams();
      if (schoolCode) params.set('schoolCode', schoolCode);
      return request<any[]>(`/tablets?${params.toString()}`);
    },
    create: (data: { deviceId: string; name: string; block: string; schoolCode?: string }) =>
      request<any>('/tablets', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    toggleLock: (id: string) =>
      request<any>(`/tablets/${id}/lock`, {
        method: 'PATCH',
      }),
  },

  // ─── Calls ───
  calls: {
    getActive: (schoolCode?: string) => {
      const params = new URLSearchParams();
      if (schoolCode) params.set('schoolCode', schoolCode);
      return request<any[]>(`/calls/active?${params.toString()}`);
    },
    getHistory: (schoolCode?: string) => {
      const params = new URLSearchParams();
      if (schoolCode) params.set('schoolCode', schoolCode);
      return request<any[]>(`/calls/history?${params.toString()}`);
    },
    initiate: (data: { studentId: string; parentId: string; tabletId?: string; schoolCode?: string }) =>
      request<any>('/calls/initiate', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    end: (callId: string, durationSeconds?: number, reason?: string) =>
      request<any>('/calls/end', {
        method: 'POST',
        body: JSON.stringify({ callId, durationSeconds, reason }),
      }),
  },

  // ─── Stats ───
  stats: {
    getOverview: (schoolCode?: string) => {
      const params = new URLSearchParams();
      if (schoolCode) params.set('schoolCode', schoolCode);
      return request<any>(`/stats/overview?${params.toString()}`);
    },
  },
};
