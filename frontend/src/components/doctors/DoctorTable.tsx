import { Link } from 'react-router-dom'
import { ActiveBadge } from '../ui/Badge.tsx'
import { Button } from '../ui/Button.tsx'
import { initials } from '../../utils/format.ts'
import { availabilitySummary } from '../../utils/availability.ts'
import type { Doctor } from '../../types.ts'

interface DoctorTableProps {
  doctors: Doctor[]
  onEdit: (doctor: Doctor) => void
  onDelete: (doctor: Doctor) => void
}

export function DoctorTable({ doctors, onEdit, onDelete }: DoctorTableProps) {
  return (
    <>
    <div className="table-wrap">
      <table className="table">
        <caption className="sr-only">Doctors and their contact information, availability, and status</caption>
        <thead>
          <tr>
            <th scope="col">Doctor</th>
            <th scope="col">Contact</th>
            <th scope="col">Availability</th>
            <th scope="col">Status</th>
            <th scope="col"><span className="sr-only">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {doctors.map((doctor) => (
            <tr key={doctor.id}>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem' }}>
                  <span
                    aria-hidden="true"
                    style={{
                      width: 36, height: 36, borderRadius: 12, flex: 'none',
                      display: 'grid', placeItems: 'center',
                      background: 'var(--blue-50)', color: 'var(--blue-700)',
                      fontWeight: 600, fontSize: 'var(--t-sm)',
                    }}
                  >
                    {initials(doctor.name)}
                  </span>
                  <div>
                    <Link to={`/doctors/${doctor.id}`} className="cell-strong" style={{ textDecoration: 'none' }}>
                      {doctor.name}
                    </Link>
                    <div className="cell-sub">{doctor.specialization}</div>
                  </div>
                </div>
              </td>
              <td>
                <div>{doctor.email}</div>
                <div className="cell-sub">{doctor.phone}</div>
              </td>
              <td className="cell-sub">{availabilitySummary(doctor.weekly_availability)}</td>
              <td><ActiveBadge active={doctor.is_active} /></td>
              <td>
                <div className="row-actions">
                  <Button variant="ghost" size="sm" onClick={() => onEdit(doctor)}>
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onDelete(doctor)}>
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    <div className="mobile-records" role="list" aria-label="Doctors">
      {doctors.map((doctor) => (
        <article className="record-card" role="listitem" key={doctor.id}>
          <div className="record-card__head">
            <div>
              <h3><Link to={`/doctors/${doctor.id}`}>{doctor.name}</Link></h3>
              <p className="record-card__sub">{doctor.specialization}</p>
            </div>
            <ActiveBadge active={doctor.is_active} />
          </div>
          <dl className="record-card__details">
            <div><dt>Email</dt><dd><a href={`mailto:${doctor.email}`}>{doctor.email}</a></dd></div>
            <div><dt>Phone</dt><dd><a href={`tel:${doctor.phone}`}>{doctor.phone}</a></dd></div>
            <div><dt>Availability</dt><dd>{availabilitySummary(doctor.weekly_availability)}</dd></div>
          </dl>
          <div className="record-card__actions">
            <Link className="btn btn--secondary btn--sm" to={`/doctors/${doctor.id}`}>View</Link>
            <Button variant="ghost" size="sm" onClick={() => onEdit(doctor)}>Edit</Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(doctor)}>Delete</Button>
          </div>
        </article>
      ))}
    </div>
    </>
  )
}
