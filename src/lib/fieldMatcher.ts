import type { Candidate, FillReport } from './types'

interface FieldPattern {
  key: keyof Candidate
  patterns: string[]
  transform?: (val: unknown) => string
}

const FIELD_PATTERNS: FieldPattern[] = [
  { key: 'first_name',           patterns: ['first name', 'firstname', 'given name', 'first'] },
  { key: 'last_name',            patterns: ['last name', 'lastname', 'surname', 'family name', 'last'] },
  { key: 'email',                patterns: ['email', 'email address', 'e-mail'] },
  { key: 'phone',                patterns: ['phone', 'mobile', 'telephone', 'cell', 'phone number'] },
  { key: 'location',             patterns: ['city', 'location', 'current location', 'city/town'] },
  { key: 'linkedin_url',         patterns: ['linkedin', 'linkedin url', 'linkedin profile'] },
  { key: 'github_url',           patterns: ['github', 'github url', 'portfolio', 'github profile'] },
  { key: 'portfolio_url',        patterns: ['website', 'personal website', 'portfolio website'] },
  { key: 'job_title',            patterns: ['current title', 'current role', 'job title'] },
  { key: 'work_auth',            patterns: ['authorized to work', 'work authorization', 'legally authorized', 'eligible to work'], transform: (v) => v ? 'Yes' : 'No' },
  { key: 'requires_sponsorship', patterns: ['visa sponsorship', 'require sponsorship', 'need sponsorship'], transform: (v) => v ? 'Yes' : 'No' },
  { key: 'gender',               patterns: ['gender', 'sex', 'gender identity', 'what is your gender', 'how do you identify', 'gender expression'] },
  { key: 'pronouns',             patterns: ['pronouns', 'preferred pronouns', 'your pronouns'] },
  { key: 'race',                 patterns: ['race', 'racial', 'race/ethnicity'] },
  { key: 'ethnicity',            patterns: ['ethnicity', 'ethnic', 'ethnic background', 'ethnic origin', 'hispanic', 'latino', 'are you hispanic or latino'] },
  { key: 'disability_status',    patterns: ['disability', 'disabled', 'disability status', 'do you have a disability', 'person with a disability', 'accommodation', 'ada'] },
  { key: 'veteran_status',       patterns: ['veteran', 'military', 'military service', 'military status', 'protected veteran', 'armed forces', 'served in the military', 'are you a veteran'] },
  { key: 'marital_status',       patterns: ['marital', 'marital status', 'marriage', 'married', 'civil status', 'relationship status'] },
  { key: 'religion',             patterns: ['religion', 'religious', 'religious beliefs', 'faith', 'religious affiliation'] },
  { key: 'date_of_birth',        patterns: ['date of birth', 'dob', 'birth date', 'birthday', 'age', 'how old are you'] },
  { key: 'nationality',          patterns: ['nationality', 'national origin', 'country of origin', 'citizenship', 'country of citizenship', 'country of birth'] },
]

const getLabel = (el: HTMLElement): string => {
  if (el.id) {
    const label = document.querySelector(`label[for="${el.id}"]`)
    if (label) return label.textContent?.toLowerCase().trim() ?? ''
  }
  const aria = el.getAttribute('aria-label')
  if (aria) return aria.toLowerCase().trim()
  
  const placeholder = el.getAttribute('placeholder')
  if (placeholder) return placeholder.toLowerCase().trim()
  
  const name = el.getAttribute('name')
  if (name) return name.toLowerCase().replace(/[_-]/g, ' ').trim()
  
  const parent = el.closest('[class*="field"], [class*="input"], [class*="form"]')
  if (parent) return parent.textContent?.toLowerCase().trim().split('\n')[0] ?? ''
  
  return ''
}

const injectValue = (el: HTMLElement, value: string) => {
  // Radio buttons
  if (el instanceof HTMLInputElement && el.type === 'radio') {
    const radios = document.querySelectorAll<HTMLInputElement>(`input[type="radio"][name="${el.name}"]`)
    radios.forEach(radio => {
      if (radio.value.toLowerCase() === value.toLowerCase() ||
          radio.labels?.[0]?.textContent?.toLowerCase().includes(value.toLowerCase())) {
        radio.click()
        radio.checked = true
        radio.dispatchEvent(new Event('change', { bubbles: true }))
        radio.style.outline = '2px solid #22c55e'
        setTimeout(() => radio.style.removeProperty('outline'), 2000)
      }
    })
    return
  }

  // Checkboxes
  if (el instanceof HTMLInputElement && el.type === 'checkbox') {
    const shouldCheck = ['yes', 'true', '1'].includes(value.toLowerCase())
    if (el.checked !== shouldCheck) {
      el.click()
      el.dispatchEvent(new Event('change', { bubbles: true }))
    }
    el.style.outline = '2px solid #22c55e'
    setTimeout(() => el.style.removeProperty('outline'), 2000)
    return
  }

  // Standard select
  if (el instanceof HTMLSelectElement) {
    const options = Array.from(el.options)
    const match = options.find(o =>
      o.text.toLowerCase().includes(value.toLowerCase()) ||
      o.value.toLowerCase().includes(value.toLowerCase())
    )
    if (match) {
      el.value = match.value
      el.dispatchEvent(new Event('change', { bubbles: true }))
      el.style.border = '2px solid #22c55e'
      setTimeout(() => el.style.removeProperty('border'), 2000)
    }
    return
  }

  // Custom div-dropdowns (e.g., Workday)
  if (el.getAttribute('role') === 'combobox' || el.classList.toString().toLowerCase().includes('select')) {
    el.click() // Open the custom dropdown
    setTimeout(() => {
      const options = Array.from(document.querySelectorAll('li, [role="option"], .option, [class*="option"]'))
      const match = options.find(o => o.textContent?.toLowerCase().trim() === value.toLowerCase().trim() ||
                                      o.textContent?.toLowerCase().includes(value.toLowerCase()))
      if (match && match instanceof HTMLElement) {
        match.click()
      }
    }, 150)
    el.style.border = '2px solid #22c55e'
    setTimeout(() => el.style.removeProperty('border'), 2000)
    return
  }

  // Text input / textarea
  const nativeSetter = Object.getOwnPropertyDescriptor(
    el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
    'value'
  )?.set
  nativeSetter?.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
  el.dispatchEvent(new FocusEvent('blur', { bubbles: true }))
  el.style.border = '2px solid #22c55e'
  setTimeout(() => el.style.removeProperty('border'), 2000)
}

export const fillForm = (candidate: Candidate): FillReport => {
  const elements = Array.from(
    document.querySelectorAll<HTMLElement>(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="password"]), textarea, select, [role="combobox"], div[class*="select"]'
    )
  )

  let filled = 0
  let skipped = 0
  const needsReview: string[] = []

  for (const el of elements) {
    const label = getLabel(el)
    if (!label) { skipped++; continue }

    const match = FIELD_PATTERNS.find(fp =>
      fp.patterns.some(p => label.includes(p))
    )

    if (match) {
      const rawValue = candidate[match.key]
      if (rawValue === undefined || rawValue === null || rawValue === '') { skipped++; continue }
      const value = match.transform
        ? match.transform(rawValue)
        : String(rawValue)
      injectValue(el, value)
      filled++
    } else if (el instanceof HTMLTextAreaElement) {
      // Unmatched textarea = likely a custom question
      el.style.border = '2px solid #eab308'
      needsReview.push(label || 'Unknown question')
    } else {
      skipped++
    }
  }

  return { filled, skipped, needsReview }
}
