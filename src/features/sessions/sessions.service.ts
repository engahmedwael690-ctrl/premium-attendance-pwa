import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '../../lib/firebase/db'

export type SessionStatus = 'IN' | 'OUT'

export type SessionRecord = {
  id: string
  employeeName: string
  employeeCode: string
  checkInAt?: Timestamp | null
  checkInLat?: number | null
  checkInLng?: number | null
  checkInAccuracy?: number | null
  checkOutAt?: Timestamp | null
  checkOutLat?: number | null
  checkOutLng?: number | null
  checkOutAccuracy?: number | null
  status: SessionStatus
}

type CoordinatesPayload = {
  latitude: number
  longitude: number
  accuracy: number | null
}

const sessionsRef = collection(db, 'sessions')

const toSessionRecord = (snapshot: { id: string; data: () => Record<string, unknown> }) => {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    employeeName: String(data.employeeName ?? ''),
    employeeCode: String(data.employeeCode ?? ''),
    checkInAt: (data.checkInAt as Timestamp | null | undefined) ?? null,
    checkInLat: (data.checkInLat as number | null | undefined) ?? null,
    checkInLng: (data.checkInLng as number | null | undefined) ?? null,
    checkInAccuracy: (data.checkInAccuracy as number | null | undefined) ?? null,
    checkOutAt: (data.checkOutAt as Timestamp | null | undefined) ?? null,
    checkOutLat: (data.checkOutLat as number | null | undefined) ?? null,
    checkOutLng: (data.checkOutLng as number | null | undefined) ?? null,
    checkOutAccuracy: (data.checkOutAccuracy as number | null | undefined) ?? null,
    status: (data.status as SessionStatus) ?? 'IN',
  }
}

export const subscribeSessions = (
  onData: (sessions: SessionRecord[]) => void,
  onError?: (error: Error) => void,
) => {
  const sessionsQuery = query(sessionsRef, orderBy('checkInAt', 'desc'))
  return onSnapshot(
    sessionsQuery,
    (snapshot) => {
      onData(snapshot.docs.map((docSnap) => toSessionRecord(docSnap)))
    },
    (error) => {
      if (onError) onError(error)
    },
  )
}

export const createSessionCheckIn = async (
  employeeName: string,
  employeeCode: string,
  coords: CoordinatesPayload,
) => {
  const docRef = await addDoc(sessionsRef, {
    employeeName,
    employeeCode,
    checkInAt: serverTimestamp(),
    checkInLat: coords.latitude,
    checkInLng: coords.longitude,
    checkInAccuracy: coords.accuracy,
    status: 'IN',
  })
  return docRef.id
}

export const updateSessionCheckOut = async (
  sessionId: string,
  coords: CoordinatesPayload,
) => {
  await updateDoc(doc(sessionsRef, sessionId), {
    checkOutAt: serverTimestamp(),
    checkOutLat: coords.latitude,
    checkOutLng: coords.longitude,
    checkOutAccuracy: coords.accuracy,
    status: 'OUT',
  })
}

export const fetchSessionsByDateRange = async (start: Date, end: Date) => {
  const startTimestamp = Timestamp.fromDate(start)
  const endTimestamp = Timestamp.fromDate(end)
  const sessionsQuery = query(
    sessionsRef,
    where('checkInAt', '>=', startTimestamp),
    where('checkInAt', '<=', endTimestamp),
    orderBy('checkInAt', 'asc'),
  )
  const snapshot = await getDocs(sessionsQuery)
  return snapshot.docs.map((docSnap) => toSessionRecord(docSnap))
}
