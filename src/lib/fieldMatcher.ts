import type { Candidate, FillReport } from './types'

interface FieldPattern {
  key: string
  patterns: string[]
  transform?: (val: unknown) => string
  isArray?: boolean
  arrayKey?: 'work_experiences' | 'education' | 'skills'
}

const FIELD_PATTERNS: FieldPattern[] = [
  { key: 'first_name',           patterns: ['first name', 'firstname', 'given name', 'first'] },
  { key: 'last_name',            patterns: ['last name', 'lastname', 'surname', 'family name', 'last'] },
  { key: 'email',                patterns: ['email', 'email address', 'e-mail'] },
  { key: 'username',             patterns: ['username', 'user name', 'login name'] },
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
  // Phase 12 Patterns
  { key: 'salary_expectation',   patterns: ['salary', 'expected salary', 'compensation', 'desired pay'] },
  { key: 'postal_code',          patterns: ['zip', 'zip code', 'postal code', 'post code'] },
  { key: 'state',                patterns: ['state', 'province', 'region'] },
  { key: 'city',                 patterns: ['city', 'town'] },
  { key: 'default_password',     patterns: ['password', 'confirm password', 'choose a password', 'create a password'] },
  { key: 'resume_url',           patterns: ['resume', 'cv', 'upload resume'] },
  { key: 'cover_letter_url',     patterns: ['cover letter', 'upload cover letter'] },
  
  // Array fields (Work Experience)
  { key: 'company',              patterns: ['company', 'employer', 'organization'], isArray: true, arrayKey: 'work_experiences' },
  { key: 'job_title',            patterns: ['job title', 'title', 'position'], isArray: true, arrayKey: 'work_experiences' },
  { key: 'start_date',           patterns: ['start date', 'from date', 'date started'], isArray: true, arrayKey: 'work_experiences' },
  { key: 'end_date',             patterns: ['end date', 'to date', 'date ended'], isArray: true, arrayKey: 'work_experiences' },
  { key: 'description',          patterns: ['description', 'responsibilities', 'duties'], isArray: true, arrayKey: 'work_experiences' },
  
  // Array fields (Education)
  { key: 'institution',          patterns: ['institution', 'university', 'college', 'school'], isArray: true, arrayKey: 'education' },
  { key: 'degree',               patterns: ['degree', 'qualification'], isArray: true, arrayKey: 'education' },
  { key: 'field_of_study',       patterns: ['field of study', 'major', 'program'], isArray: true, arrayKey: 'education' },
  
  // Array fields (Skills)
  { key: 'name',                 patterns: ['skill', 'core competence', 'competency'], isArray: true, arrayKey: 'skills' }
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

const injectFile = async (el: HTMLInputElement, fileUrl: string, fileName: string) => {
  try {
    const response = await fetch(fileUrl)
    const blob = await response.blob()
    const file = new File([blob], fileName, { type: blob.type || 'application/pdf' })
    const dataTransfer = new DataTransfer()
    dataTransfer.items.add(file)
    el.files = dataTransfer.files
    el.dispatchEvent(new Event('change', { bubbles: true }))
    el.style.border = '2px solid #22c55e'
    setTimeout(() => el.style.removeProperty('border'), 2000)
  } catch (e) {
    console.error("Failed to fetch and inject file from URL:", fileUrl, e)
  }
}

const injectValue = async (el: HTMLElement, value: string, isFile = false) => {
  // Handle File Uploads (Phase 12.2)
  if (el instanceof HTMLInputElement && el.type === 'file' && isFile) {
    await injectFile(el, value, value.includes('cover_letter') ? 'CoverLetter.pdf' : 'Resume.pdf')
    return
  }

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

export const fillForm = async (candidate: Candidate): Promise<FillReport> => {
  const elements = Array.from(
    document.querySelectorAll<HTMLElement>(
      'input:not([type="hidden"]):not([type="submit"]):not([type="button"]), textarea, select, [role="combobox"], div[class*="select"]'
    )
  )

  const report: FillReport = { filled: 0, skipped: 0, needsReview: [] }
  const arrayCounters: Record<string, number> = {}

  for (const el of elements) {
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      if (el.type !== 'checkbox' && el.type !== 'radio' && el.type !== 'hidden') {
        if (el.value && el.value.trim() !== '') {
          report.skipped++;
          continue;
        }
      }
    }

    const label = getLabel(el)
    if (!label) { report.skipped++; continue }

    const matched = FIELD_PATTERNS.find(fp => fp.patterns.some(p => label.includes(p)))

    if (matched) {
      if (matched.isArray && matched.arrayKey) {
        const subKey = matched.key
        arrayCounters[subKey] = arrayCounters[subKey] || 0
        const index = arrayCounters[subKey]
        const arr = (candidate as any)[matched.arrayKey] as any[]
        
        if (arr && arr[index] && arr[index][subKey] !== undefined) {
          const value = matched.transform ? matched.transform(arr[index][subKey]) : String(arr[index][subKey])
          await injectValue(el, value)
          report.filled++
          arrayCounters[subKey]++
        } else {
          report.skipped++
        }
      } else {
        const rawValue = (candidate as any)[matched.key]
        if (rawValue !== undefined && rawValue !== null) {
          const isFile = matched.key === 'resume_url' || matched.key === 'cover_letter_url'
          const value = matched.transform ? matched.transform(rawValue) : String(rawValue)
          await injectValue(el, value, isFile)
          report.filled++
        } else {
          report.skipped++
        }
      }
    } else if (el instanceof HTMLTextAreaElement) {
      el.style.border = '2px solid #eab308'
      report.needsReview.push(label || 'Unknown question')
    } else {
      report.skipped++
    }
  }

  return report
}
