import { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import UpdateToast from '../pwa/UpdateToast'
import { initServiceWorker } from '../pwa/registerSW'
import { AppRoutes } from './AppRoutes'
import './App.css'

function App() {
  useEffect(() => {
    console.log('Firebase ready')
    initServiceWorker()
  }, [])

  return (
    <BrowserRouter>
      <AppRoutes />
      <UpdateToast />
    </BrowserRouter>
  )
}

export default App
