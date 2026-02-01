import { ReactNode, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../lib/firebase/auth'

type AuthState = 'loading' | 'authenticated' | 'unauthenticated'

type RequireAdminAuthProps = {
  children: ReactNode
}

export function RequireAdminAuth({ children }: RequireAdminAuthProps) {
  const [state, setState] = useState<AuthState>('loading')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setState(user ? 'authenticated' : 'unauthenticated')
    })
    return () => unsubscribe()
  }, [])

  if (state === 'loading') {
    return (
      <main className="page">
        <p>Checking admin session...</p>
      </main>
    )
  }

  if (state === 'unauthenticated') {
    return <Navigate to="/admin/login" replace />
  }

  return <>{children}</>
}
