const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1'

/**
 * Every failure the UI can show arrives as one of these, so components never
 * have to tell a network failure apart from a 409 by inspecting raw responses.
 */
export class ApiError extends Error {
  readonly status: number
  readonly errors: string[]

  constructor(status: number, errors: string[]) {
    super(errors[0] ?? 'Request failed')
    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }

  /** True when the server rejected the submitted values, rather than failing. */
  get isValidation(): boolean {
    return this.status === 400
  }

  /** True for a duplicate email or a double-booked slot. */
  get isConflict(): boolean {
    return this.status === 409
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: options.body ? { 'Content-Type': 'application/json', ...options.headers } : options.headers,
    })
  } catch {
    // fetch only rejects when the request never completed — the API is down,
    // DNS failed, or the browser is offline. Say that, rather than "failed".
    throw new ApiError(0, ['Could not reach the server. Check that the API is running.'])
  }

  if (res.status === 204) return undefined as T

  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const errors = (body as { errors?: string[] } | null)?.errors
    throw new ApiError(res.status, errors?.length ? errors : [`Request failed (${res.status})`])
  }
  return body as T
}

/** Drops empty values so `?status=` never reaches the API as a blank filter. */
export function query(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: (path: string) => request<void>(path, { method: 'DELETE' }),
}
