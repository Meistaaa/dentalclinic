import { useId } from 'react'
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

interface BaseProps {
  label: string
  error?: string
  hint?: string
  wide?: boolean
}

function Wrapper({
  label,
  error,
  hint,
  wide,
  id,
  children,
}: BaseProps & { id: string; children: ReactNode }) {
  return (
    <div className={`field${wide ? ' field--wide' : ''}`}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      {children}
      {hint && !error && <span className="field__hint">{hint}</span>}
      {error && (
        <span className="field__error" id={`${id}-error`} role="alert">
          {error}
        </span>
      )}
    </div>
  )
}

export function TextField({
  label,
  error,
  hint,
  wide,
  ...props
}: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <Wrapper label={label} error={error} hint={hint} wide={wide} id={id}>
      <input
        id={id}
        className="input"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
    </Wrapper>
  )
}

export function SelectField({
  label,
  error,
  hint,
  wide,
  children,
  ...props
}: BaseProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId()
  return (
    <Wrapper label={label} error={error} hint={hint} wide={wide} id={id}>
      <select
        id={id}
        className="select"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      >
        {children}
      </select>
    </Wrapper>
  )
}

export function TextAreaField({
  label,
  error,
  hint,
  wide,
  ...props
}: BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId()
  return (
    <Wrapper label={label} error={error} hint={hint} wide={wide} id={id}>
      <textarea
        id={id}
        className="textarea"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
    </Wrapper>
  )
}

export function CheckboxField({
  label,
  hint,
  ...props
}: { label: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <div className="field field--wide">
      <div className="checkbox-row">
        <input id={id} type="checkbox" {...props} />
        <label className="field__label" htmlFor={id} style={{ marginBottom: 0 }}>
          {label}
        </label>
      </div>
      {hint && <span className="field__hint">{hint}</span>}
    </div>
  )
}

export function SearchField({ label, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <div className="field" style={{ flex: 1, minWidth: '200px' }}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <div className="search">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.6" />
          <path d="m11 11 3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <input id={id} className="input" type="search" {...props} />
      </div>
    </div>
  )
}
