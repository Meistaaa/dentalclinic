import { useRef } from 'react'
import { Button } from './Button.tsx'
import { Modal } from './Modal.tsx'

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  busy?: boolean
  error?: string | null
  onConfirm: () => Promise<void>
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  busy,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const confirming = useRef(false)
  async function confirm() {
    if (confirming.current) return
    confirming.current = true
    try { await onConfirm() } finally { confirming.current = false }
  }

  return (
    <Modal
      open={open}
      title={title}
      size="sm"
      onClose={() => { if (!confirming.current) onCancel() }}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirm} busy={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p style={{ color: 'var(--ink-soft)' }}>{message}</p>
      {error && (
        <p className="field__error" role="alert" style={{ marginTop: '.75rem' }}>
          {error}
        </p>
      )}
    </Modal>
  )
}
