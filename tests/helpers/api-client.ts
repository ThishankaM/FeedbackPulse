export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  token?: string;
}

export interface ApiResponse<T = any> {
  status: number;
  headers: Headers;
  data: T;
  raw: Response;
}

export class ApiClient {
  constructor(private readonly app: { request: (path: string, init?: RequestInit) => Promise<Response> }) {}

  async request<T = any>(path: string, options: ApiRequestOptions = {}): Promise<ApiResponse<T>> {
    const headers = new Headers(options.headers || {});

    if (options.token) {
      headers.set('Authorization', `Bearer ${options.token}`);
    }

    let body: string | undefined;
    if (options.body !== undefined) {
      if (typeof options.body === 'string') {
        body = options.body;
      } else {
        headers.set('Content-Type', 'application/json');
        body = JSON.stringify(options.body);
      }
    }

    const res = await this.app.request(path, {
      method: options.method || 'GET',
      headers,
      body,
    });

    let data: any = null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        data = await res.json();
      } catch {
        data = null;
      }
    } else {
      try {
        data = await res.text();
      } catch {
        data = null;
      }
    }

    return {
      status: res.status,
      headers: res.headers,
      data,
      raw: res,
    };
  }

  get<T = any>(path: string, token?: string, headers?: Record<string, string>) {
    return this.request<T>(path, { method: 'GET', token, headers });
  }

  post<T = any>(path: string, body?: any, token?: string, headers?: Record<string, string>) {
    return this.request<T>(path, { method: 'POST', body, token, headers });
  }

  patch<T = any>(path: string, body?: any, token?: string, headers?: Record<string, string>) {
    return this.request<T>(path, { method: 'PATCH', body, token, headers });
  }

  delete<T = any>(path: string, token?: string, headers?: Record<string, string>) {
    return this.request<T>(path, { method: 'DELETE', token, headers });
  }
}

export function createApiClient(app: { request: (path: string, init?: RequestInit) => Promise<Response> }) {
  return new ApiClient(app);
}
