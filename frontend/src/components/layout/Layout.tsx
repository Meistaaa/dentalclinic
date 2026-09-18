import { useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar.tsx'

export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDialogElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const location = useLocation()

  useEffect(() => { setMenuOpen(false) }, [location.pathname])
  useEffect(() => {
    const menu = menuRef.current
    if (!menu) return
    if (menuOpen && !menu.open) menu.showModal()
    if (!menuOpen && menu.open) menu.close()
  }, [menuOpen])

  function closeMenu() {
    setMenuOpen(false)
    menuButtonRef.current?.focus()
  }

  return (
    <div className="shell">
      <a className="skip-link" href="#main">Skip to main content</a>
      <div className="desktop-sidebar"><Sidebar /></div>
      <div className="main">
        <header className="mobile-topbar">
          <span className="mobile-topbar__brand">Bright Smile</span>
          <button ref={menuButtonRef} type="button" className="mobile-menu-button" aria-label="Open menu" aria-expanded={menuOpen} aria-controls="mobile-navigation" onClick={() => setMenuOpen(true)}>
            <span aria-hidden="true">☰</span><span>Menu</span>
          </button>
        </header>
        <main className="content" id="main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
      <dialog ref={menuRef} id="mobile-navigation" className="mobile-nav-dialog" aria-label="Navigation menu" onClose={() => setMenuOpen(false)} onCancel={closeMenu} onClick={(event) => { if (event.target === menuRef.current) closeMenu() }}>
        <Sidebar onNavigate={closeMenu} onClose={closeMenu} />
      </dialog>
    </div>
  )
}

/** Page heading plus its actions; every page opens with one. */
export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string
  title: string
  children?: React.ReactNode
}) {
  return (
    <header className="topbar" style={{ padding: 0 }}>
      <div>
        {eyebrow && <p className="topbar__eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
      </div>
      {children && <div className="btn-row">{children}</div>}
    </header>
  )
}
