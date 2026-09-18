import { useCallback, useState } from 'react'
import { PageHeader } from '../components/layout/Layout.tsx'
import { Card, CardHead } from '../components/ui/Card.tsx'
import { Button } from '../components/ui/Button.tsx'
import { SearchField, SelectField } from '../components/ui/Field.tsx'
import { EmptyState, ErrorState, Loading } from '../components/ui/States.tsx'
import { ConfirmDialog } from '../components/ui/ConfirmDialog.tsx'
import { DoctorForm } from '../components/doctors/DoctorForm.tsx'
import { DoctorTable } from '../components/doctors/DoctorTable.tsx'
import { useAsync, useDebounced } from '../hooks/useAsync.ts'
import { useToast } from '../hooks/useToast.tsx'
import * as doctorsApi from '../services/doctorsService.ts'
import { ApiError } from '../services/api.ts'
import type { Doctor, DoctorInput } from '../types.ts'

export function Doctors() {
  const { notify } = useToast()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'' | 'true' | 'false'>('')
  const debouncedSearch = useDebounced(search)

  const load = useCallback(
    () => doctorsApi.listDoctors({ search: debouncedSearch, is_active: status }),
    [debouncedSearch, status],
  )
  const { data, loading, error, reload } = useAsync(load, [debouncedSearch, status])

  const [editing, setEditing] = useState<Doctor | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<Doctor | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function save(input: DoctorInput) {
    if (editing) {
      await doctorsApi.updateDoctor(editing.id, input)
      notify(`${input.name} updated`)
    } else {
      await doctorsApi.createDoctor(input)
      notify(`${input.name} added`)
    }
    setFormOpen(false)
    setEditing(null)
    reload()
  }

  async function confirmDelete() {
    if (!deleting) return
    setDeleteBusy(true)
    setDeleteError(null)
    try {
      await doctorsApi.deleteDoctor(deleting.id)
      notify(`${deleting.name} deleted`)
      setDeleting(null)
      reload()
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.errors.join(' ') : 'Could not delete this doctor')
    } finally {
      setDeleteBusy(false)
    }
  }

  const filtered = Boolean(debouncedSearch || status)

  return (
    <>
      <PageHeader eyebrow="Clinic" title="Doctors">
        <Button
          variant="primary"
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          Add doctor
        </Button>
      </PageHeader>

      <Card>
        <CardHead title="All doctors" count={data ? `${data.length}` : undefined}>
          <div className="filters">
            <SearchField
              label="Search"
              placeholder="Name or specialization"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <SelectField
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value as '' | 'true' | 'false')}
            >
              <option value="">All</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </SelectField>
          </div>
        </CardHead>

        {loading && <Loading label="Loading doctors" />}
        {error && <ErrorState message={error.message} onRetry={reload} />}
        {data && data.length > 0 && (
          <DoctorTable
            doctors={data}
            onEdit={(doctor) => {
              setEditing(doctor)
              setFormOpen(true)
            }}
            onDelete={(doctor) => {
              setDeleteError(null)
              setDeleting(doctor)
            }}
          />
        )}
        {data && data.length === 0 && (
          <EmptyState
            title={filtered ? 'No doctors match those filters' : 'No doctors yet'}
            message={
              filtered
                ? 'Try a different name or specialization, or clear the status filter.'
                : 'Add the clinic’s first doctor and they become available for booking immediately.'
            }
            action={
              filtered ? (
                <Button
                  onClick={() => {
                    setSearch('')
                    setStatus('')
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <Button variant="primary" onClick={() => setFormOpen(true)}>
                  Add doctor
                </Button>
              )
            }
          />
        )}
      </Card>

      <DoctorForm
        open={formOpen}
        doctor={editing}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        onSubmit={save}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title={`Delete ${deleting?.name ?? 'this doctor'}?`}
        message="This cannot be undone. A doctor who already has appointments cannot be deleted — deactivate them instead."
        busy={deleteBusy}
        error={deleteError}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </>
  )
}
