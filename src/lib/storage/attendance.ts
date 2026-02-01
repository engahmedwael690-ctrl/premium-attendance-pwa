import { storageKeys } from './index'

export type EmployeeRecord = {
  code: string
  name?: string
  checkedIn: boolean
  lastCheckIn: string | null
  lastCheckOut: string | null
  lastPing: string | null
  activeSessionId: string | null
  sessions: TrackingSession[]
}

export type AttendanceState = {
  employees: EmployeeRecord[]
}

export type TrackingPing = {
  timestamp: string
  lat: number
  lng: number
  accuracy: number
  insideOffice: boolean
}

export type TrackingEventType = 'LeftOffice' | 'BackInOffice' | 'SignalLost'

export type TrackingEvent = {
  timestamp: string
  type: TrackingEventType
}

export type TrackingSession = {
  id: string
  start: string
  end: string | null
  pings: TrackingPing[]
  events: TrackingEvent[]
}

const defaultState: AttendanceState = {
  employees: [],
}

const readState = (): AttendanceState => {
  const raw = localStorage.getItem(storageKeys.attendance)
  if (!raw) return defaultState
  try {
    const parsed = JSON.parse(raw) as AttendanceState
    if (!parsed || !Array.isArray(parsed.employees)) return defaultState
    const normalizedEmployees = parsed.employees.map((employee) => ({
      ...employee,
      activeSessionId: employee.activeSessionId ?? null,
      sessions: employee.sessions ?? [],
    }))
    return { employees: normalizedEmployees }
  } catch {
    return defaultState
  }
}

const writeState = (state: AttendanceState) => {
  localStorage.setItem(storageKeys.attendance, JSON.stringify(state))
}

export const getAttendanceState = () => readState()

export const getEmployee = (code: string) =>
  readState().employees.find((employee) => employee.code === code)

export const upsertEmployee = (code: string) => {
  const state = readState()
  const existing = state.employees.find((employee) => employee.code === code)
  const now = new Date().toISOString()
  if (existing) {
    existing.lastPing = now
  } else {
    state.employees.push({
      code,
      checkedIn: false,
      lastCheckIn: null,
      lastCheckOut: null,
      lastPing: now,
      activeSessionId: null,
      sessions: [],
    })
  }
  writeState(state)
}

export const updatePing = (code: string) => {
  const state = readState()
  const employee = state.employees.find((item) => item.code === code)
  if (!employee) return
  employee.lastPing = new Date().toISOString()
  writeState(state)
}

export const checkIn = (code: string) => {
  const state = readState()
  const employee = state.employees.find((item) => item.code === code)
  if (!employee) return
  const now = new Date().toISOString()
  employee.checkedIn = true
  employee.lastCheckIn = now
  employee.lastPing = now
  if (!employee.activeSessionId) {
    const sessionId = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    employee.activeSessionId = sessionId
    employee.sessions.push({
      id: sessionId,
      start: now,
      end: null,
      pings: [],
      events: [],
    })
  }
  writeState(state)
}

export const checkOut = (code: string) => {
  const state = readState()
  const employee = state.employees.find((item) => item.code === code)
  if (!employee) return
  const now = new Date().toISOString()
  employee.checkedIn = false
  employee.lastCheckOut = now
  employee.lastPing = now
  if (employee.activeSessionId) {
    const session = employee.sessions.find(
      (item) => item.id === employee.activeSessionId,
    )
    if (session) {
      session.end = now
    }
    employee.activeSessionId = null
  }
  writeState(state)
}

const getActiveSession = (employee: EmployeeRecord) => {
  if (!employee.activeSessionId) return null
  return (
    employee.sessions.find((session) => session.id === employee.activeSessionId) ??
    null
  )
}

const ensureActiveSession = (employee: EmployeeRecord) => {
  const existing = getActiveSession(employee)
  if (existing) return existing
  const now = new Date().toISOString()
  const sessionId = `${Date.now()}-${Math.random().toString(16).slice(2)}`
  const session: TrackingSession = {
    id: sessionId,
    start: now,
    end: null,
    pings: [],
    events: [],
  }
  employee.activeSessionId = sessionId
  employee.sessions.push(session)
  return session
}

export const recordGpsPing = (code: string, ping: TrackingPing) => {
  const state = readState()
  const employee = state.employees.find((item) => item.code === code)
  if (!employee || !employee.checkedIn) return
  const session = ensureActiveSession(employee)
  const previousPing = session.pings[session.pings.length - 1]
  if (previousPing && previousPing.insideOffice !== ping.insideOffice) {
    session.events.push({
      timestamp: ping.timestamp,
      type: ping.insideOffice ? 'BackInOffice' : 'LeftOffice',
    })
  }
  session.pings.push(ping)
  employee.lastPing = ping.timestamp
  writeState(state)
}

export const recordSignalLost = (code: string) => {
  const state = readState()
  const employee = state.employees.find((item) => item.code === code)
  if (!employee || !employee.checkedIn) return
  const session = ensureActiveSession(employee)
  const now = new Date().toISOString()
  session.events.push({ timestamp: now, type: 'SignalLost' })
  employee.lastPing = now
  writeState(state)
}

export const getCurrentEmployeeCode = () =>
  localStorage.getItem(storageKeys.currentEmployee)

export const setCurrentEmployeeCode = (code: string) => {
  localStorage.setItem(storageKeys.currentEmployee, code)
}

export const clearCurrentEmployeeCode = () => {
  localStorage.removeItem(storageKeys.currentEmployee)
}
