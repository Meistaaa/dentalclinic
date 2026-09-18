import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from '../services/api.ts'

interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: ApiError | null
}

/**
 * Runs a fetch on mount and whenever `deps` change, and hands back a `reload`
 * so mutations can refresh the view. Results from a superseded request are
 * discarded, so a slow first response cannot overwrite a newer one.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> & { reload: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ data: null, loading: true, error: null })
  const [nonce, setNonce] = useState(0)
  const latest = useRef(0)

  const fnRef = useRef(fn)
  fnRef.current = fn

  useEffect(() => {
    const ticket = ++latest.current
    setState((prev) => ({ ...prev, loading: true, error: null }))
    fnRef
      .current()
      .then((data) => {
        if (ticket === latest.current) setState({ data, loading: false, error: null })
      })
      .catch((err: unknown) => {
        if (ticket !== latest.current) return
        const error = err instanceof ApiError ? err : new ApiError(0, ['Something went wrong'])
        setState({ data: null, loading: false, error })
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])
  return { ...state, reload }
}

/** Debounces a fast-changing value, so typing in a search box is one request. */
export function useDebounced<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}
