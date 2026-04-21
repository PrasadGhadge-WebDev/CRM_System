import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export default function ScrollToTop() {
  const { pathname, search, hash } = useLocation()

  useEffect(() => {
    const crmContent = document.querySelector('.crmContent')

    if (crmContent) {
      crmContent.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname, search, hash])

  return null
}
