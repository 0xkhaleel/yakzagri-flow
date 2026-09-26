/**
 * Frontend HTTP client with correlation ID propagation
 * 
 * This client automatically:
 * - Generates and propagates correlation IDs across requests
 * - Maintains request context for debugging
 * - Provides consistent error handling
 * - Tracks request timing and metadata
 */

export interface TracedRequestOptions extends RequestInit {
  correlationId?: string;
  timeout?: number;
}

export interface TracedResponse<T = unknown> extends Response {
  data?: T;
  correlationId?: string;
  requestId?: string;
  timing?: {
    startTime: number;
    endTime: number;
    duration: number;
  };
}

/**
 * Traced HTTP client for frontend applications
 */
export class TracedHttpClient {
  private static instance: TracedHttpClient;
  private baseHeaders: Record<string, string> = {};
  private baseURL: string = '';
  private defaultTimeout: number = 30000; // 30 seconds

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): TracedHttpClient {
    if (!TracedHttpClient.instance) {
      TracedHttpClient.instance = new TracedHttpClient();
    }
    return TracedHttpClient.instance;
  }

  /**
   * Set base URL for all requests
   */
  setBaseURL(url: string): void {
    this.baseURL = url.replace(/\/$/, ''); // Remove trailing slash
  }

  /**
   * Set default headers for all requests
   */
  setDefaultHeaders(headers: Record<string, string>): void {
    this.baseHeaders = { ...this.baseHeaders, ...headers };
  }

  /**
   * Set authorization header
   */
  setAuthToken(token: string): void {
    this.baseHeaders['Authorization'] = `Bearer ${token}`;
  }

  /**
   * Generate or retrieve correlation ID
   */
  private getCorrelationId(providedId?: string): string {
    if (providedId) return providedId;
    
    // Try to get from session storage for cross-request correlation
    let correlationId = sessionStorage.getItem('amana-correlation-id');
    if (!correlationId) {
      correlationId = this.generateUUID();
      sessionStorage.setItem('amana-correlation-id', correlationId);
    }
    return correlationId;
  }

  /**
   * Generate UUID v4
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return this.generateUUID();
  }

  /**
   * Create fetch URL with base URL
   */
  private createURL(url: string): string {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `${this.baseURL}${url}`;
  }

  /**
   * Create headers with tracing information
   */
  private createHeaders(options: TracedRequestOptions): Record<string, string> {
    const correlationId = this.getCorrelationId(options.correlationId);
    const requestId = this.generateRequestId();

    const headers: Record<string, string> = {
      'X-Correlation-Id': correlationId,
      'X-Request-Id': requestId,
      ...this.baseHeaders,
    };

    // Only set Content-Type when there is a request body. Setting it on
    // bodyless requests (e.g. GET/HEAD) forces a CORS preflight on every
    // cross-origin call, so we omit it unless a payload is present.
    if (options.body != null) {
      headers['Content-Type'] = 'application/json';
    }

    // Add custom headers from options
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        if (typeof value === 'string') {
          headers[key] = value;
        }
      });
    }

    return headers;
  }

  /**
   * Handle fetch with timeout
   */
  private async fetchWithTimeout(
    url: string,
    options: TracedRequestOptions,
    timeout: number
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * Make HTTP request with tracing
   */
  private async request<T = unknown>(
    method: string,
    url: string,
    options: TracedRequestOptions = {}
  ): Promise<TracedResponse<T>> {
    const startTime = performance.now();
    const headers = this.createHeaders(options);
    const correlationId = headers['X-Correlation-Id'];
    const requestId = headers['X-Request-Id'];

    // Log request start
    console.log(`[${correlationId}] ${method} ${url}`, {
      correlationId,
      requestId,
      method,
      url,
      headers: Object.fromEntries(
        Object.entries(headers).filter(([key]) => 
          !key.toLowerCase().includes('authorization')
        )
      ),
    });

    try {
      const response = await this.fetchWithTimeout(
        this.createURL(url),
        {
          ...options,
          method,
          headers,
        },
        options.timeout || this.defaultTimeout
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Log response
      console.log(`[${correlationId}] ${method} ${url} - ${response.status}`, {
        correlationId,
        requestId,
        status: response.status,
        statusText: response.statusText,
        duration: Math.round(duration),
        headers: Object.fromEntries(response.headers.entries()),
      });

      // Parse response body if it's JSON
      let data: T | undefined;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        try {
          data = await response.json();
        } catch (error) {
          console.warn(`[${correlationId}] Failed to parse JSON response:`, error);
        }
      }

      const tracedResponse: TracedResponse<T> = {
        ...response,
        data,
        correlationId,
        requestId,
        timing: {
          startTime,
          endTime,
          duration,
        },
      };

      // Handle error responses
      if (!response.ok) {
        const error = new Error(
          `HTTP ${response.status}: ${response.statusText}` +
          (data && typeof data === 'object' && 'message' in data 
            ? ` - ${(data as Record<string, unknown>).message}` 
            : '')
        );
        const httpError = error as Error & { status?: number; response?: TracedResponse<T> };
        httpError.status = response.status;
        httpError.response = tracedResponse;
        throw httpError;
      }

      return tracedResponse;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;

      console.error(`[${correlationId}] ${method} ${url} - ERROR`, {
        correlationId,
        requestId,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Math.round(duration),
      });

      throw error;
    }
  }

  /**
   * GET request
   */
  async get<T = unknown>(url: string, options: TracedRequestOptions = {}): Promise<TracedResponse<T>> {
    return this.request<T>('GET', url, options);
  }

  /**
   * POST request
   */
  async post<T = unknown>(url: string, data?: unknown, options: TracedRequestOptions = {}): Promise<TracedResponse<T>> {
    return this.request<T>('POST', url, {
      ...options,
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T = unknown>(url: string, data?: unknown, options: TracedRequestOptions = {}): Promise<TracedResponse<T>> {
    return this.request<T>('PUT', url, {
      ...options,
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T = unknown>(url: string, data?: unknown, options: TracedRequestOptions = {}): Promise<TracedResponse<T>> {
    return this.request<T>('PATCH', url, {
      ...options,
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T = unknown>(url: string, options: TracedRequestOptions = {}): Promise<TracedResponse<T>> {
    return this.request<T>('DELETE', url, options);
  }
}

/**
 * Default traced HTTP client instance
 */
export const tracedHttpClient = TracedHttpClient.getInstance();
