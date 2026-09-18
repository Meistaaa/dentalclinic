import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/layout/Layout.tsx'
import { Dashboard } from './pages/Dashboard.tsx'
import { Doctors } from './pages/Doctors.tsx'
import { DoctorDetail } from './pages/DoctorDetail.tsx'
import { Appointments } from './pages/Appointments.tsx'
import { NotFound } from './pages/NotFound.tsx'

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/doctors" element={<Doctors />} />
        <Route path="/doctors/:id" element={<DoctorDetail />} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
