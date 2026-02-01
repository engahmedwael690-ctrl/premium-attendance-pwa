import { Route, Routes } from 'react-router-dom'
import { RequireAdminAuth } from './RequireAdminAuth'
import AdminPage from '../pages/AdminPage'
import AdminLoginPage from '../pages/AdminLoginPage'
import EmployeePage from '../pages/EmployeePage'
import HomePage from '../pages/HomePage'
import NotFoundPage from '../pages/NotFoundPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/employee" element={<EmployeePage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route
        path="/admin"
        element={
          <RequireAdminAuth>
            <AdminPage />
          </RequireAdminAuth>
        }
      />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
