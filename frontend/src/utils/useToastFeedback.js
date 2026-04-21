import { useEffect, useRef } from 'react'
import { toast } from 'react-toastify'

export function useToastFeedback({ error = '', success = '', info = '' } = {}) {
  const lastShownRef = useRef({
    error: '',
    success: '',
    info: '',
  })

  useEffect(() => {
    if (!error) {
      lastShownRef.current.error = ''
      return
    }

    if (lastShownRef.current.error === error) return
    lastShownRef.current.error = error
    toast.error(error)
  }, [error])

  useEffect(() => {
    if (!success) {
      lastShownRef.current.success = ''
      return
    }

    if (lastShownRef.current.success === success) return
    lastShownRef.current.success = success
    toast.success(success)
  }, [success])

  useEffect(() => {
    if (!info) {
      lastShownRef.current.info = ''
      return
    }

    if (lastShownRef.current.info === info) return
    lastShownRef.current.info = info
    toast.info(info)
  }, [info])
}
