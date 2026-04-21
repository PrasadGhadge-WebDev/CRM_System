import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const FOCUSABLE_SELECTOR = [
  'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  '[contenteditable="true"]',
].join(',')

const TEXT_FIELD_TYPES = new Set([
  '',
  'text',
  'email',
  'password',
  'search',
  'tel',
  'url',
  'number',
])

function isEligibleField(element) {
  if (!(element instanceof HTMLElement)) return false
  if (element.matches('textarea')) return false
  if (element.matches('select')) return true
  if (element.matches('[contenteditable="true"]')) return true
  if (!element.matches('input')) return false

  const type = (element.getAttribute('type') || '').toLowerCase()
  return TEXT_FIELD_TYPES.has(type)
}

function isClickableControl(element) {
  return element.matches('button, input[type="button"], input[type="submit"], input[type="reset"]')
}

function focusNextField(currentField) {
  const form = currentField.closest('form')
  if (!form) return false

  const focusable = Array.from(form.querySelectorAll(FOCUSABLE_SELECTOR)).filter((element) => {
    if (!(element instanceof HTMLElement)) return false
    if (element.hasAttribute('hidden')) return false
    return element.offsetParent !== null || element.matches('[contenteditable="true"]')
  })

  const currentIndex = focusable.indexOf(currentField)
  if (currentIndex === -1) return false

  for (let index = currentIndex + 1; index < focusable.length; index += 1) {
    const nextField = focusable[index]
    if (isClickableControl(nextField)) continue
    if (!isEligibleField(nextField)) continue
    nextField.focus()
    if (typeof nextField.select === 'function') {
      nextField.select()
    }
    return true
  }

  return false
}

function focusFirstFieldInDocument() {
  const forms = Array.from(document.querySelectorAll('form'))

  for (const form of forms) {
    const focusable = Array.from(form.querySelectorAll(FOCUSABLE_SELECTOR)).filter((element) => {
      if (!(element instanceof HTMLElement)) return false
      if (element.hasAttribute('hidden')) return false
      return element.offsetParent !== null || element.matches('[contenteditable="true"]')
    })

    const firstField = focusable.find((element) => isEligibleField(element) && !isClickableControl(element))
    if (firstField) {
      firstField.focus()
      if (typeof firstField.select === 'function') {
        firstField.select()
      }
      return true
    }
  }

  return false
}

export default function EnterToNextField() {
  const location = useLocation()

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.defaultPrevented || event.key !== 'Enter' || event.isComposing) return
      if (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return

      const target = event.target
      if (!(target instanceof HTMLElement)) return
      if (target.matches('textarea')) return
      if (target.matches('button, input[type="button"], input[type="submit"], input[type="reset"]')) return
      if (!isEligibleField(target)) return

      const form = target.closest('form')
      if (!form) return

      const hasAnotherField = focusNextField(target)
      if (hasAnotherField) {
        event.preventDefault()
      }
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const activeElement = document.activeElement
      const shouldAutoFocus =
        !activeElement ||
        activeElement === document.body ||
        activeElement === document.documentElement

      if (shouldAutoFocus) {
        focusFirstFieldInDocument()
      }
    }, 0)

    return () => window.clearTimeout(timer)
  }, [location.pathname])

  return null
}
