import type { ReactNode } from 'react'

export function Card({ children, pad }: { children: ReactNode; pad?: boolean }) {
  return <section className={`card${pad ? ' card--pad' : ''}`}>{children}</section>
}

export function CardHead({
  title,
  count,
  children,
}: {
  title: string
  count?: ReactNode
  children?: ReactNode
}) {
  return (
    <header className="card__head">
      <div className="card__title">
        <h2>{title}</h2>
        {count !== undefined && <span className="card__count">{count}</span>}
      </div>
      {children}
    </header>
  )
}
