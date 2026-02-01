import { useEffect, useState } from 'react'
import { subscribePwaState, updateServiceWorker } from './registerSW'

type PwaToastState = {
  needRefresh: boolean
  offlineReady: boolean
}

function UpdateToast() {
  const [pwaState, setPwaState] = useState<PwaToastState>({
    needRefresh: false,
    offlineReady: false,
  })
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => subscribePwaState(setPwaState), [])

  if (!pwaState.needRefresh && !pwaState.offlineReady) {
    return null
  }

  const handleUpdate = () => {
    setIsUpdating(true)
    updateServiceWorker(true)
    window.setTimeout(() => {
      if (document.visibilityState === 'visible') {
        window.location.reload()
      }
    }, 2500)
  }

  return (
    <div className="pwa-toast" role="status" aria-live="polite">
      <span>
        {pwaState.needRefresh ? 'Update available' : 'App ready for offline use'}
      </span>
      {pwaState.needRefresh ? (
        <button type="button" onClick={handleUpdate} disabled={isUpdating}>
          {isUpdating ? 'Updating...' : 'Update'}
        </button>
      ) : null}
    </div>
  )
}

export default UpdateToast
