import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { signOut } from 'firebase/auth'
import { Timestamp } from 'firebase/firestore'
import * as XLSX from 'xlsx'
import { auth } from '../lib/firebase/auth'
import {
  createEmployee,
  deleteEmployee,
  subscribeEmployees,
  type EmployeeRecord,
} from '../features/employees/employees.service'
import {
  fetchSessionsByDateRange,
  subscribeSessions,
  type SessionRecord,
} from '../features/sessions/sessions.service'

const formatDate = (timestamp?: Timestamp | null) =>
  timestamp ? timestamp.toDate().toLocaleDateString() : ''

const formatTime = (timestamp?: Timestamp | null) =>
  timestamp ? timestamp.toDate().toLocaleTimeString() : ''

const getTodayValue = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const toMillis = (timestamp?: Timestamp | null) =>
  timestamp ? timestamp.toMillis() : 0

function AdminPage() {
  const [employees, setEmployees] = useState<EmployeeRecord[]>([])
  const [employeesLoading, setEmployeesLoading] = useState(true)
  const [employeesError, setEmployeesError] = useState('')

  const [sessions, setSessions] = useState<SessionRecord[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [sessionsError, setSessionsError] = useState('')

  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const [dateFrom, setDateFrom] = useState(getTodayValue())
  const [dateTo, setDateTo] = useState(getTodayValue())
  const [excelLoading, setExcelLoading] = useState(false)
  const [excelError, setExcelError] = useState('')

  useEffect(() => {
    const unsubscribe = subscribeEmployees(
      (data) => {
        setEmployees(data)
        setEmployeesLoading(false)
      },
      () => {
        setEmployeesError('Unable to load employees.')
        setEmployeesLoading(false)
      },
    )
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const unsubscribe = subscribeSessions(
      (data) => {
        setSessions(data)
        setSessionsLoading(false)
      },
      () => {
        setSessionsError('Unable to load sessions.')
        setSessionsLoading(false)
      },
    )
    return () => unsubscribe()
  }, [])

  const latestSessionsByCode = useMemo(() => {
    const map = new Map<string, SessionRecord>()
    sessions.forEach((session) => {
      const existing = map.get(session.employeeCode)
      if (!existing || toMillis(session.checkInAt) > toMillis(existing.checkInAt)) {
        map.set(session.employeeCode, session)
      }
    })
    return map
  }, [sessions])

  const insideOffice = useMemo(() => {
    return employees.filter((employee) => {
      const session = latestSessionsByCode.get(employee.code)
      return Boolean(session && session.status === 'IN' && !session.checkOutAt)
    })
  }, [employees, latestSessionsByCode])

  const outsideOffice = useMemo(() => {
    const insideCodes = new Set(insideOffice.map((employee) => employee.code))
    return employees.filter((employee) => !insideCodes.has(employee.code))
  }, [employees, insideOffice])

  const handleAddEmployee = async (event: FormEvent) => {
    event.preventDefault()
    const trimmedName = name.trim()
    const trimmedCode = code.trim()
    if (!trimmedName || !trimmedCode) {
      setActionError('Name and code are required.')
      return
    }
    setActionLoading(true)
    setActionError('')
    try {
      await createEmployee(trimmedName, trimmedCode)
      setName('')
      setCode('')
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Unable to create employee.',
      )
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeleteEmployee = async (id: string) => {
    setActionLoading(true)
    setActionError('')
    try {
      await deleteEmployee(id)
    } catch (err) {
      setActionError('Unable to delete employee.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleLogout = async () => {
    await signOut(auth)
  }

  const handleDownloadExcel = async () => {
    setExcelLoading(true)
    setExcelError('')
    try {
      if (!dateFrom || !dateTo) {
        setExcelError('Please select a valid date range.')
        return
      }
      const start = new Date(dateFrom)
      const end = new Date(dateTo)
      if (start > end) {
        setExcelError('Date from must be before date to.')
        return
      }
      end.setHours(23, 59, 59, 999)
      const results = await fetchSessionsByDateRange(start, end)
      if (results.length === 0) {
        setExcelError('No sessions found for this range.')
        return
      }
      const rows = results.map((session) => ({
        Date: formatDate(session.checkInAt),
        EmployeeName: session.employeeName,
        EmployeeCode: session.employeeCode,
        CheckInTime: formatTime(session.checkInAt),
        CheckOutTime: formatTime(session.checkOutAt),
        CheckInLat: session.checkInLat ?? '',
        CheckInLng: session.checkInLng ?? '',
        CheckOutLat: session.checkOutLat ?? '',
        CheckOutLng: session.checkOutLng ?? '',
        Status: session.status,
      }))

      const worksheet = XLSX.utils.json_to_sheet(rows)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance')
      const fileName = `attendance-${dateFrom}-to-${dateTo}.xlsx`
      XLSX.writeFile(workbook, fileName)
    } catch (err) {
      setExcelError('Failed to download the Excel file.')
    } finally {
      setExcelLoading(false)
    }
  }

  return (
    <main className="page">
      <header className="page__header">
        <h1>Admin Dashboard</h1>
        <p>Manage employees, monitor attendance, and export reports.</p>
      </header>

      <section className="card stack">
        <div className="section__header">
          <h2>Admin Access</h2>
          <button className="button button--ghost" type="button" onClick={handleLogout}>
            Logout
          </button>
        </div>
        <p className="muted">
          Admin accounts are created in Firebase Console only.
        </p>
      </section>

      <section className="card stack">
        <div className="section__header">
          <h2>Employees</h2>
          <span>{employees.length}</span>
        </div>
        <form className="form stack" onSubmit={handleAddEmployee}>
          <label className="field">
            <span>Name</span>
            <input
              type="text"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                if (actionError) setActionError('')
              }}
              disabled={actionLoading}
            />
          </label>
          <label className="field">
            <span>Code</span>
            <input
              type="text"
              value={code}
              onChange={(event) => {
                setCode(event.target.value)
                if (actionError) setActionError('')
              }}
              disabled={actionLoading}
            />
          </label>
          {actionError ? <p className="form__error">{actionError}</p> : null}
          <button className="button button--primary" type="submit" disabled={actionLoading}>
            {actionLoading ? 'Saving...' : 'Add Employee'}
          </button>
        </form>
        {employeesLoading ? <p>Loading employees...</p> : null}
        {employeesError ? <p className="form__error">{employeesError}</p> : null}
        {!employeesLoading && employees.length === 0 ? (
          <p className="muted">No employees yet.</p>
        ) : null}
        {employees.length > 0 ? (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Code</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id}>
                    <td>{employee.name}</td>
                    <td>{employee.code}</td>
                    <td>{employee.isActive ? 'Active' : 'Inactive'}</td>
                    <td>
                      <button
                        className="button button--ghost button--small"
                        type="button"
                        onClick={() => handleDeleteEmployee(employee.id)}
                        disabled={actionLoading}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section className="card stack">
        <div className="section__header">
          <h2>Inside Office</h2>
          <span>{insideOffice.length}</span>
        </div>
        {sessionsLoading ? <p>Loading sessions...</p> : null}
        {sessionsError ? <p className="form__error">{sessionsError}</p> : null}
        {!sessionsLoading && insideOffice.length === 0 ? (
          <p className="muted">No one is currently inside.</p>
        ) : null}
        {insideOffice.length > 0 ? (
          <ul className="list">
            {insideOffice.map((employee) => (
              <li key={employee.id} className="list__item">
                <div>
                  <strong>{employee.name}</strong>
                  <span className="muted">Code {employee.code}</span>
                </div>
                <span className="tag">Inside</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="card stack">
        <div className="section__header">
          <h2>Outside Office</h2>
          <span>{outsideOffice.length}</span>
        </div>
        {!sessionsLoading && outsideOffice.length === 0 ? (
          <p className="muted">Everyone is inside.</p>
        ) : null}
        {outsideOffice.length > 0 ? (
          <ul className="list">
            {outsideOffice.map((employee) => (
              <li key={employee.id} className="list__item">
                <div>
                  <strong>{employee.name}</strong>
                  <span className="muted">Code {employee.code}</span>
                </div>
                <span className="tag tag--warning">Outside</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="card stack">
        <div className="section__header">
          <h2>Attendance Export</h2>
        </div>
        <div className="grid">
          <label className="field">
            <span>Date from</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              disabled={excelLoading}
            />
          </label>
          <label className="field">
            <span>Date to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              disabled={excelLoading}
            />
          </label>
        </div>
        {excelError ? <p className="form__error">{excelError}</p> : null}
        <button
          className="button button--primary"
          type="button"
          onClick={handleDownloadExcel}
          disabled={excelLoading}
        >
          {excelLoading ? 'Preparing file...' : 'Download Attendance Excel'}
        </button>
      </section>
    </main>
  )
}

export default AdminPage
