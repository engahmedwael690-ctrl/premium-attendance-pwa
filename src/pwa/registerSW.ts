import { registerSW } from 'virtual:pwa-register'

type PwaState = {
  needRefresh: boolean
  offlineReady: boolean
}

type Listener = (state: PwaState) => void

let state: PwaState = {
  needRefresh: false,
  offlineReady: false,
}

let listeners: Listener[] = []
let updateSW: ((reloadPage?: boolean) => void) | null = null
let initialized = false

const notify = () => {
  listeners.forEach((listener) => listener(state))
}

const setState = (partial: Partial<PwaState>) => {
  state = { ...state, ...partial }
  notify()
}

export const initServiceWorker = () => {
  if (initialized) return
  initialized = true
  updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      setState({ needRefresh: true })
    },
    onOfflineReady() {
      setState({ offlineReady: true })
    },
    onRegisterError(error) {
      console.error('Service worker registration error:', error)
    },
  })
}

export const subscribePwaState = (listener: Listener) => {
  listeners = [...listeners, listener]
  listener(state)
  return () => {
    listeners = listeners.filter((item) => item !== listener)
  }
}

export const updateServiceWorker = (reloadPage = true) => {
  if (!updateSW) return
  updateSW(reloadPage)
}
