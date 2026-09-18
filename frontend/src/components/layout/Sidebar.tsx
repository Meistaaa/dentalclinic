import { NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'

const ICONS: Record<string, ReactNode> = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2.5" y="2.5" width="6" height="6" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="11.5" y="2.5" width="6" height="6" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="2.5" y="11.5" width="6" height="6" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="11.5" y="11.5" width="6" height="6" rx="2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  doctors: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="6.5" r="3.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 17c.6-3.3 3.3-5.2 6.5-5.2s5.9 1.9 6.5 5.2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
  appointments: (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2.75" y="4" width="14.5" height="13.25" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6.5 2.5V5M13.5 2.5V5M2.75 8h14.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
}

const LINKS = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/doctors', label: 'Doctors', icon: 'doctors' },
  { to: '/appointments', label: 'Appointments', icon: 'appointments' },
]

export function Sidebar({ onNavigate, onClose }: { onNavigate?: () => void; onClose?: () => void }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand__mark" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 17.5s-5.8-3.5-5.8-8.2A3.7 3.7 0 0 1 10 6.1a3.7 3.7 0 0 1 5.8 3.2c0 4.7-5.8 8.2-5.8 8.2Z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path d="M10 2.5v3.6M8.2 4.3h3.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </span>
        <span className="brand__name">Bright Smile</span>
        {onClose && <button type="button" className="sidebar__close" onClick={onClose} aria-label="Close menu">×</button>}
      </div>

      <nav className="nav" aria-label="Main">
        <span className="nav__label">Clinic</span>
        {LINKS.map((link) => (
          <NavLink key={link.to} to={link.to} className="nav__item" onClick={onNavigate}>
            {ICONS[link.icon]}
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__foot">Bright Smile Dental Clinic</div>
    </aside>
  )
}
