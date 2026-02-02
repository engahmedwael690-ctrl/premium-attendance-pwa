import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInAnonymously } from 'firebase/auth'
import { auth } from '../lib/firebase/auth'

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

type GeoPermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported' | 'error'

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

const isLocalhost = () =>
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname === '[::1]'

const getGeolocationPermissionState = async (): Promise<GeoPermissionState> => {
  if (!navigator.permissions?.query) return 'unsupported'
  try {
    const status = await navigator.permissions.query({
      name: 'geolocation' as PermissionName,
    })
    return status.state
  } catch {
    return 'error'
  }
}

const formatGeolocationError = (
  err: unknown,
  permissionState: GeoPermissionState,
) => {
  if (!window.isSecureContext && !isLocalhost()) {
    return 'Location blocked: this site is not secure. Use HTTPS (or localhost).'
  }

  if (permissionState === 'denied') {
    return 'Location permission denied in browser settings. Allow location for this site and retry.'
  }

  const geoError = err as GeolocationPositionError
  if (typeof geoError?.code === 'number') {
    if (geoError.code === 1)
      return 'Location permission denied. Please allow location for this site.'
    if (geoError.code === 2)
      return 'Location unavailable. Turn on GPS/Location services and try again.'
    if (geoError.code === 3) return 'Location timeout. Please try again.'
    return 'Location error. Please try again.'
  }

  if (err instanceof Error && err.message) return err.message
  return 'Unable to get location. Please check browser and device settings.'
}

const getCurrentPosition = () =>
  new Promise<GeolocationPosition>((resolve, reject) => {
    if (!window.isSecureContext && !isLocalhost()) {
      reject(new Error('Geolocation requires HTTPS or localhost.'))
      return
    }
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported on this device.'))
      return
    }

    const tryLowAccuracy = () => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: false,
        timeout: 20000,
        maximumAge: 60000,
      })
    }

    navigator.geolocation.getCurrentPosition(
      resolve,
      (err) => {
        // لو high accuracy فشل/اتأخر جرّب low accuracy
        if (err.code === 2 || err.code === 3) {
          tryLowAccuracy()
          return
        }
        reject(err)
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    )
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

  // ✅ مهم: خلي الموظف يبقى authenticated (anonymous) علشان يقدر يكتب sessions
  useEffect(() => {
    if (!auth.currentUser) {
      signInAnonymously(auth).catch((e) => {
        console.log('Anonymous auth failed:', e)
      })
    }
  }, [])

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
      console.log('LOGIN ERROR:', err)
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
      console.log('CHECK-IN ERROR:', err)
      const permissionState = await getGeolocationPermissionState()
      console.log('CHECK-IN GEO PERMISSION:', permissionState)
      setError(formatGeolocationError(err, permissionState))
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
      console.log('CHECK-OUT ERROR:', err)
      const permissionState = await getGeolocationPermissionState()
      console.log('CHECK-OUT GEO PERMISSION:', permissionState)
      setError(formatGeolocationError(err, permissionState))
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
