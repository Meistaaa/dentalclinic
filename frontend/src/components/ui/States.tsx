import type { ReactNode } from 'react'
import { Button } from './Button.tsx'

/** Skeleton rows, so a slow list does not collapse the layout then snap back. */
export function Loading({ rows = 5, label = 'Loading' }: { rows?: number; label?: string }) {
  return (
    <div style={{ padding: '1.25rem' }} aria-busy="true" aria-live="polite">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{ height: 44, marginBottom: 10, opacity: 1 - i * 0.13 }}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

export function EmptyState({
  title,
  message,
  action,
  icon,
}: {
  title: string
  message: string
  action?: ReactNode
  icon?: ReactNode
}) {
  return (
    <div className="state">
      <span className="state__icon" aria-hidden="true">
        {icon ?? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M12 6v12M6 12h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        )}
      </span>
      <p className="state__title">{title}</p>
      <p className="state__text">{message}</p>
      {action && <div style={{ marginTop: '.75rem' }}>{action}</div>}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state state--error" role="alert">
      <span className="state__icon" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path d="M12 7v6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="16.5" r="1.1" fill="currentColor" />
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      </span>
      <p className="state__title">That didn't work</p>
      <p className="state__text">{message}</p>
      {onRetry && (
        <div style={{ marginTop: '.75rem' }}>
          <Button onClick={onRetry}>Try again</Button>
        </div>
      )}
    </div>
  )
}
