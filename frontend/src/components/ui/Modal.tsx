import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  title: string
  description?: string
  size?: 'md' | 'sm'
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

/**
 * Built on <dialog> so the browser supplies the focus trap, the inert
 * background, Escape-to-close and the top layer — all of which a div would
 * have to reimplement, usually incompletely.
 */
export function Modal({ open, title, description, size = 'md', onClose, children, footer }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    // Fires for Escape as well as close(), keeping React's state in step.
    const onCancel = (event: Event) => {
      event.preventDefault()
      onClose()
    }
    dialog.addEventListener('cancel', onCancel)
    return () => dialog.removeEventListener('cancel', onCancel)
  }, [onClose])

  return (
    <dialog
      ref={ref}
      className={`dialog${size === 'sm' ? ' dialog--sm' : ''}`}
      aria-labelledby={titleId}
      onClick={(event) => {
        // A click on the backdrop lands on the dialog element itself.
        if (event.target === ref.current) onClose()
      }}
    >
      <div className="dialog__head">
        <div>
          <h2 id={titleId}>{title}</h2>
          {description && <p className="field__hint" style={{ marginTop: '.25rem' }}>{description}</p>}
        </div>
        <button type="button" className="dialog__close" onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <div className="dialog__body">{children}</div>
      {footer && <div className="dialog__foot">{footer}</div>}
    </dialog>
  )
}
