import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'md' | 'sm'
  busy?: boolean
  children: ReactNode
}

export function Button({ variant = 'secondary', size = 'md', busy, children, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      type={props.type ?? 'button'}
      className={`btn btn--${variant}${size === 'sm' ? ' btn--sm' : ''}`}
      disabled={props.disabled || busy}
    >
      {busy && <span className="spinner" aria-hidden="true" />}
      {children}
    </button>
  )
}
