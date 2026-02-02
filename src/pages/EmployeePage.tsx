import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { findActiveEmployeeByCode } from '../features/employees/employees.service'
import {
  createSessionCheckIn,
  updateSessionCheckOut,
} from '../features/sessions/sessions.service'

type StoredEmployee = {
  name: string
  code: string
}

type StoredSession = {
  id: string
}

const STORAGE_KEYS = {
  employeeName: 'employeeName',
  employeeCode: 'employeeCode',
  activeSessionId: 'activeSessionId',
}

const readStoredEmployee = (): StoredEmployee | null => {
  const name = localStorage.getItem(STORAGE_KEYS.employeeName)
  const code = localStorage.getItem(STORAGE_KEYS.employeeCode)
  if (!name || !code) return null
  return { name, code }
}

const writeStoredEmployee = (employee: StoredEmployee) => {
  localStorage.setItem(STORAGE_KEYS.employeeName, employee.name)
  localStorage.setItem(STORAGE_KEYS.employeeCode, employee.code)
}

const clearStoredEmployee = () => {
  localStorage.removeItem(STORAGE_KEYS.employeeName)
  localStorage.removeItem(STORAGE_KEYS.employeeCode)
}

const readStoredSession = (): StoredSession | null => {
  const id = localStorage.getItem(STORAGE_KEYS.activeSessionId)
  if (!id) return null
  return { id }
}

const writeStoredSession = (sessionId: string) => {
  localStorage.setItem(STORAGE_KEYS.activeSessionId, sessionId)
}

const clearStoredSession = () => {
  localStorage.removeItem(STORAGE_KEYS.activeSessionId)
}

const getCurrentPosition = () =>
  new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported on this device.'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
    })
  })

function EmployeePage() {
  const navigate = useNavigate()
  const [employee, setEmployee] = useState<StoredEmployee | null>(() =>
    readStoredEmployee(),
  )
  const [activeSession, setActiveSession] = useState<StoredSession | null>(() =>
    readStoredSession(),
  )
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const statusText = useMemo(() => {
    if (!employee) return ''
    return activeSession ? 'You are checked in.' : 'You are checked out.'
  }, [employee, activeSession])

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = code.trim()
    if (!trimmed) {
      setError('Please enter your employee code.')
      return
    }
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const match = await findActiveEmployeeByCode(trimmed)
      if (!match) {
        setError('Employee not found or inactive.')
        return
      }
      const stored = { name: match.name || match.code, code: match.code }
      writeStoredEmployee(stored)
      setEmployee(stored)
      setCode('')
      setMessage('Login successful.')
    } catch (err) {
      setError('Failed to login. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckIn = async () => {
    if (!employee) return
    if (activeSession) {
      setError('You already have an active session.')
      return
    }
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const position = await getCurrentPosition()
      const sessionId = await createSessionCheckIn(employee.name, employee.code, {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy ?? null,
      })
      writeStoredSession(sessionId)
      setActiveSession({ id: sessionId })
      setMessage('Checked in successfully.')
    } catch (err) {
      setError('Unable to check in. Please allow location access.')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckOut = async () => {
    if (!employee) return
    if (!activeSession) {
      setError('No active session found. Please check in first.')
      return
    }
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const position = await getCurrentPosition()
      await updateSessionCheckOut(activeSession.id, {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy ?? null,
      })
      clearStoredSession()
      setActiveSession(null)
      setMessage('Checked out successfully.')
    } catch (err) {
      setError('Unable to check out. Please allow location access.')
    } finally {
      setLoading(false)
    }
  }

  const handleBackToLogin = () => {
    clearStoredEmployee()
    clearStoredSession()
    setEmployee(null)
    setActiveSession(null)
    setCode('')
    navigate('/')
  }

  if (!employee) {
    return (
      <main className="page">
        <header className="page__header">
          <h1>Employee Login</h1>
          <p>Enter your employee code to continue.</p>
        </header>
        <form className="card form stack" onSubmit={handleLogin}>
          <label className="field">
            <span>Employee code</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="e.g. 1024"
              value={code}
              onChange={(event) => {
                setCode(event.target.value)
                if (error) setError('')
              }}
              disabled={loading}
            />
          </label>
          {error ? <p className="form__error">{error}</p> : null}
          <button className="button button--primary" type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </main>
    )
  }

  return (
    <main className="page">
      <header className="page__header">
        <h1>Hi {employee.name}!</h1>
        <p>{statusText}</p>
      </header>
      <section className="card stack">
        {message ? <p className="notice">{message}</p> : null}
        {error ? <p className="form__error">{error}</p> : null}
        <div className="grid">
          <button
            className="button button--primary"
            type="button"
            onClick={handleCheckIn}
            disabled={loading || Boolean(activeSession)}
          >
            {loading && !activeSession ? 'Checking in...' : 'Check-in'}
          </button>
          <button
            className="button button--ghost"
            type="button"
            onClick={handleCheckOut}
            disabled={loading || !activeSession}
          >
            {loading && activeSession ? 'Checking out...' : 'Check-out'}
          </button>
        </div>
      </section>
      <button className="link link-button" type="button" onClick={handleBackToLogin}>
        Back 
      </button>
    </main>
  )
}

export default EmployeePage
