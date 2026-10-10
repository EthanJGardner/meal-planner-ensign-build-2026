import { useEffect, useRef, useState } from 'react'

export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key)
      return stored !== null ? JSON.parse(stored) : initialValue
    } catch {
      return initialValue
    }
  })

  const keyRef = useRef(key)

  useEffect(() => {
    try {
      window.localStorage.setItem(keyRef.current, JSON.stringify(value))
    } catch {
      // Storage may be unavailable (private browsing, quota, etc). The app
      // still works, it just won't persist across a refresh.
    }
  }, [value])

  return [value, setValue]
}
