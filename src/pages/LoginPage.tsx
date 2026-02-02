import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  setCurrentEmployeeCode,
  upsertEmployee,
} from '../lib/storage/attendance'

function LoginPage() {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = code.trim()
    if (!trimmed) {
      setError('Please enter your employee code.')
      return
    }
    upsertEmployee(trimmed)
    setCurrentEmployeeCode(trimmed)
    navigate('/employee')
  }

  return (
    <main className="page">
      <header className="page__header">
        <h1>Welcome back</h1>
        <p>Use your employee code to sign in.</p>
      </header>
      <form className="card form" onSubmit={handleSubmit}>
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
          />
        </label>
        {error ? <p className="form__error">{error}</p> : null}
        <button className="button button--primary" type="submit">
          Continue
        </button>
      </form>
    </main>
  )
}

export default LoginPage
