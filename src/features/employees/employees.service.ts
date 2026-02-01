import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  where,
} from 'firebase/firestore'
import { db } from '../../lib/firebase/db'

export type EmployeeRecord = {
  id: string
  name: string
  code: string
  isActive: boolean
  createdAt?: Timestamp | null
}

const employeesRef = collection(db, 'employees')

const toEmployeeRecord = (snapshot: { id: string; data: () => Record<string, unknown> }) => {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    name: String(data.name ?? ''),
    code: String(data.code ?? ''),
    isActive: Boolean(data.isActive),
    createdAt: (data.createdAt as Timestamp | null | undefined) ?? null,
  }
}

export const subscribeEmployees = (
  onData: (employees: EmployeeRecord[]) => void,
  onError?: (error: Error) => void,
) => {
  const employeesQuery = query(employeesRef, orderBy('createdAt', 'desc'))
  return onSnapshot(
    employeesQuery,
    (snapshot) => {
      onData(snapshot.docs.map((docSnap) => toEmployeeRecord(docSnap)))
    },
    (error) => {
      if (onError) onError(error)
    },
  )
}

export const findActiveEmployeeByCode = async (code: string) => {
  const employeesQuery = query(
    employeesRef,
    where('code', '==', code),
    where('isActive', '==', true),
    limit(1),
  )
  const snapshot = await getDocs(employeesQuery)
  if (snapshot.empty) return null
  return toEmployeeRecord(snapshot.docs[0])
}

export const isEmployeeCodeTaken = async (code: string) => {
  const employeesQuery = query(employeesRef, where('code', '==', code), limit(1))
  const snapshot = await getDocs(employeesQuery)
  return !snapshot.empty
}

export const createEmployee = async (name: string, code: string) => {
  const exists = await isEmployeeCodeTaken(code)
  if (exists) {
    throw new Error('Employee code already exists.')
  }
  await addDoc(employeesRef, {
    name,
    code,
    isActive: true,
    createdAt: serverTimestamp(),
  })
}

export const deleteEmployee = async (id: string) => {
  await deleteDoc(doc(employeesRef, id))
}
