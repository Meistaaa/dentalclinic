import { Button } from '../ui/Button.tsx'
import { WEEKDAYS } from '../../utils/availability.ts'
import type { WeeklyAvailabilityPeriod } from '../../types.ts'

function nextEnd(start: string): string {
  const [hours, minutes] = start.split(':').map(Number)
  const total = Math.min(hours! * 60 + minutes! + 60, 23 * 60 + 30)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export function WeeklyScheduleEditor({
  periods, onChange, error,
}: {
  periods: WeeklyAvailabilityPeriod[]
  onChange: (periods: WeeklyAvailabilityPeriod[]) => void
  error?: string
}) {
  function setPeriod(day: number, index: number, field: 'start_time' | 'end_time', value: string) {
    const next = periods.map((period) => ({ ...period }))
    const current = next.filter((period) => period.day_of_week === day)[index]
    if (current) current[field] = value
    onChange(next)
  }

  return (
    <fieldset className="schedule-editor">
      <legend>Weekly availability</legend>
      <p className="field__hint">Appointments use 30-minute slots. Add another period for a break in the day.</p>
      {error && <p className="field__error" role="alert">{error}</p>}
      {WEEKDAYS.map((dayName, dayIndex) => {
        const day = dayIndex + 1
        const dayPeriods = periods.filter((period) => period.day_of_week === day)
        const nextStart = dayPeriods.at(-1)?.end_time ?? '09:00'
        return (
          <div className="schedule-day" key={day}>
            <label className="schedule-day__toggle">
              <input
                type="checkbox"
                checked={dayPeriods.length > 0}
                onChange={(event) => onChange(event.target.checked
                  ? [...periods, { day_of_week: day, start_time: '09:00', end_time: '17:00' }]
                  : periods.filter((period) => period.day_of_week !== day))}
              />
              <span>{dayName}</span>
            </label>
            {dayPeriods.length > 0 && (
              <div className="schedule-day__periods">
                {dayPeriods.map((period, index) => (
                  <div className="schedule-period" key={`${day}-${index}`}>
                    <label>Start
                      <input type="time" step="1800" value={period.start_time} onChange={(event) => setPeriod(day, index, 'start_time', event.target.value)} />
                    </label>
                    <label>End
                      <input type="time" step="1800" value={period.end_time} onChange={(event) => setPeriod(day, index, 'end_time', event.target.value)} />
                    </label>
                    {dayPeriods.length > 1 && (
                      <Button size="sm" variant="ghost" aria-label={`Remove ${dayName} period ${index + 1}`} onClick={() => {
                        let seen = 0
                        onChange(periods.filter((item) => item.day_of_week !== day || seen++ !== index))
                      }}>Remove</Button>
                    )}
                  </div>
                ))}
                {nextStart < '23:30' && <Button size="sm" variant="ghost" onClick={() => onChange([...periods, {
                  day_of_week: day, start_time: nextStart, end_time: nextEnd(nextStart),
                }])}>Add {dayName} period</Button>}
              </div>
            )}
          </div>
        )
      })}
    </fieldset>
  )
}
