import { Link } from 'react-router-dom'
import { EmptyState } from '../components/ui/States.tsx'
import { Card } from '../components/ui/Card.tsx'

export function NotFound() {
  return (
    <Card>
      <EmptyState
        title="Page not found"
        message="That address doesn't match anything in the clinic app."
        action={<Link className="btn btn--primary" to="/dashboard">Back to dashboard</Link>}
      />
    </Card>
  )
}
