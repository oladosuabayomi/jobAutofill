# IMPLEMENTATION.md — Step-by-Step Build Guide

## Overview

This guide takes you from zero to submitting your first automated application. Follow each phase in order — each one builds on the last.

---

## Prerequisites

- Node.js 18+ installed
- Chrome browser
- Supabase account (free at supabase.com)
- Anthropic API key (console.anthropic.com)

---

## Phase 1 — Project Scaffold

**Goal:** Get the project structure and build pipeline running.

### 1.1 Create the project

```bash
npm create vite@latest job-autofill-extension -- --template react-ts
cd job-autofill-extension
```

### 1.2 Install dependencies

```bash
npm install @supabase/supabase-js @crxjs/vite-plugin tailwindcss
npm install -D autoprefixer postcss
npx tailwindcss init -p
```

### 1.3 Configure CRXJS (Chrome Extension build plugin)

Replace `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.json'

export default defineConfig({
  plugins: [react(), crx({ manifest })],
})
```

### 1.4 Create manifest.json

```json
{
  "manifest_version": 3,
  "name": "Job Autofill",
  "version": "1.0.0",
  "description": "Auto-fill job application forms from candidate profiles",
  "permissions": ["storage", "activeTab", "scripting"],
  "host_permissions": ["<all_urls>"],
  "action": {
    "default_popup": "src/popup/popup.html",
    "default_icon": "public/icons/icon48.png"
  },
  "options_page": "src/options/options.html",
  "background": {
    "service_worker": "src/background/service-worker.ts",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["src/content/autofill.ts"],
      "run_at": "document_idle"
    }
  ]
}
```

### 1.5 Create folder structure

```bash
mkdir -p src/{popup,options,content,background,lib}
```

---

## Phase 2 — Supabase Setup

**Goal:** Get your database running with the correct schema.

### 2.1 Create a Supabase project

1. Go to supabase.com → New Project
2. Name it `job-autofill`
3. Copy your **Project URL** and **anon public key**

### 2.2 Run the schema SQL

Go to Supabase → SQL Editor → paste and run:

```sql
-- Candidates table
create table candidates (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz default now(),
  first_name      text not null,
  last_name       text not null,
  email           text not null,
  phone           text,
  location        text,
  linkedin_url    text,
  github_url      text,
  portfolio_url   text,
  job_title       text,
  years_exp       int,
  degree          text,
  field_of_study  text,
  university      text,
  grad_year       int,
  work_auth       boolean default false,
  requires_sponsorship boolean default false,
  visa_status     text,
  non_compete     boolean default false,
  resume_url      text,
  cover_letter_url text,
  other_doc_url   text,
  gender          text,
  pronouns        text,
  ethnicity       text,
  race            text,
  disability_status text,
  veteran_status  text,
  marital_status  text,
  religion        text,
  date_of_birth   date,
  nationality     text
);

-- Custom Q&A per candidate
create table candidate_qa (
  id           uuid primary key default gen_random_uuid(),
  candidate_id uuid references candidates(id) on delete cascade,
  question     text not null,
  answer       text not null
);

-- Application tracking
create table applications (
  id           uuid primary key default gen_random_uuid(),
  candidate_id uuid references candidates(id) on delete cascade,
  company      text not null,
  job_title    text,
  platform     text,
  applied_at   timestamptz default now(),
  status       text default 'submitted'
);

-- Encrypted Platform Credentials
create table candidate_credentials (
  id           uuid primary key default gen_random_uuid(),
  candidate_id uuid references candidates(id) on delete cascade,
  platform     text not null,
  platform_url text,
  email        text not null,
  password     text not null,
  notes        text,
  created_at   timestamptz default now()
);
```

### 2.3 Create the documents storage bucket

```sql
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false);
```

### 2.4 Enable Row Level Security (basic open policy for now)

```sql
alter table candidates enable row level security;
alter table candidate_qa enable row level security;
alter table applications enable row level security;

-- Temporary open policy (lock down later with auth)
create policy "allow all" on candidates for all using (true);
create policy "allow all" on candidate_qa for all using (true);
create policy "allow all" on applications for all using (true);
create policy "allow all" on candidate_credentials for all using (true);
```

---

## Phase 3 — Supabase Client + Types

**Goal:** Create shared types and the database client used across the extension.

### 3.1 `src/lib/types.ts`

```typescript
export interface Candidate {
  id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  location?: string
  linkedin_url?: string
  github_url?: string
  portfolio_url?: string
  job_title?: string
  years_exp?: number
  degree?: string
  field_of_study?: string
  university?: string
  grad_year?: number
  work_auth: boolean
  requires_sponsorship: boolean
  visa_status?: string
  non_compete: boolean
  resume_url?: string
  cover_letter_url?: string
  other_doc_url?: string
  gender?: string
  pronouns?: string
  ethnicity?: string
  race?: string
  disability_status?: string
  veteran_status?: string
  marital_status?: string
  religion?: string
  date_of_birth?: string
  nationality?: string
  qa?: QAPair[]
}

export interface QAPair {
  id: string
  candidate_id: string
  question: string
  answer: string
}

export interface Application {
  id: string
  candidate_id: string
  company: string
  job_title?: string
  platform?: string
  applied_at: string
  status: string
}

export interface CandidateCredential {
  id: string
  candidate_id: string
  platform: string
  platform_url?: string
  email: string
  password?: string // Will be decrypted client-side
  notes?: string
}

export interface FillReport {
  filled: number
  skipped: number
  needsReview: string[]
}
```

### 3.2 `src/lib/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js'
import type { Candidate, QAPair, Application } from './types'

const getKeys = async () => {
  return new Promise<{ url: string; key: string }>((resolve) => {
    chrome.storage.local.get(['supabaseUrl', 'supabaseKey'], (result) => {
      resolve({ url: result.supabaseUrl, key: result.supabaseKey })
    })
  })
}

export const getSupabase = async () => {
  const { url, key } = await getKeys()
  return createClient(url, key)
}

export const getCandidates = async (): Promise<Candidate[]> => {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('candidates')
    .select('*, qa:candidate_qa(*)')
    .order('first_name')
  if (error) throw error
  return data ?? []
}

export const getCandidate = async (id: string): Promise<Candidate> => {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('candidates')
    .select('*, qa:candidate_qa(*)')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export const saveCandidate = async (candidate: Partial<Candidate>): Promise<Candidate> => {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('candidates')
    .upsert(candidate)
    .select()
    .single()
  if (error) throw error
  return data
}

export const deleteCandidate = async (id: string): Promise<void> => {
  const supabase = await getSupabase()
  const { error } = await supabase.from('candidates').delete().eq('id', id)
  if (error) throw error
}

export const uploadDocument = async (candidateId: string, file: File, docType: 'resume' | 'cover_letter' | 'other'): Promise<string> => {
  const supabase = await getSupabase()
  const path = `${candidateId}/${docType}.pdf`
  const { error } = await supabase.storage.from('documents').upload(path, file, { upsert: true })
  if (error) throw error
  const { data } = supabase.storage.from('documents').getPublicUrl(path)
  return data.publicUrl
}

export const logApplication = async (app: Omit<Application, 'id' | 'applied_at'>): Promise<void> => {
  const supabase = await getSupabase()
  const { error } = await supabase.from('applications').insert(app)
  if (error) throw error
}

export const saveCredential = async (cred: Omit<CandidateCredential, 'id'>): Promise<void> => {
  const supabase = await getSupabase()
  const { error } = await supabase.from('candidate_credentials').insert(cred)
  if (error) throw error
}
```

---

## Phase 3.5 — Credentials Encryption (Crypto Utility)

**Goal:** Provide secure, client-side encryption and decryption using Web Crypto API.

### 3.5.1 `src/lib/crypto.ts`

```typescript
// Helper functions to encrypt/decrypt passwords before sending to Supabase
// The master key is stored securely in chrome.storage.local
export const encryptPassword = async (password: string, masterKey: string): Promise<string> => {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(masterKey), { name: 'PBKDF2' }, false, ['deriveKey']
  )
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt']
  )
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(password))
  
  const payload = new Uint8Array(salt.length + iv.length + encrypted.byteLength)
  payload.set(salt, 0)
  payload.set(iv, salt.length)
  payload.set(new Uint8Array(encrypted), salt.length + iv.length)
  return btoa(String.fromCharCode(...payload))
}

export const decryptPassword = async (encryptedData: string, masterKey: string): Promise<string> => {
  const payload = new Uint8Array(atob(encryptedData).split('').map(c => c.charCodeAt(0)))
  const salt = payload.slice(0, 16)
  const iv = payload.slice(16, 28)
  const encrypted = payload.slice(28)
  
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(masterKey), { name: 'PBKDF2' }, false, ['deriveKey']
  )
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['decrypt']
  )
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encrypted)
  return new TextDecoder().decode(decrypted)
}
```

---

## Phase 4 — Field Matcher (Core Engine)

**Goal:** Build the universal DOM pattern matcher.

### 4.1 `src/lib/fieldMatcher.ts`

```typescript
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
  // 1. Explicit label
  if (el.id) {
    const label = document.querySelector(`label[for="${el.id}"]`)
    if (label) return label.textContent?.toLowerCase().trim() ?? ''
  }
  // 2. aria-label
  const aria = el.getAttribute('aria-label')
  if (aria) return aria.toLowerCase().trim()
  // 3. placeholder
  const placeholder = el.getAttribute('placeholder')
  if (placeholder) return placeholder.toLowerCase().trim()
  // 4. name attribute
  const name = el.getAttribute('name')
  if (name) return name.toLowerCase().replace(/[_-]/g, ' ').trim()
  // 5. Nearest parent label-like text
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
      if (rawValue === undefined || rawValue === null) { skipped++; continue }
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
```

---

## Phase 5 — Background Service Worker

**Goal:** Bridge messages between popup and content script.

### 5.1 `src/background/service-worker.ts`

```typescript
import { getCandidate, logApplication } from '../lib/supabase'

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'FILL_FORM') {
    handleFill(message.candidateId, message.tabId).then(sendResponse)
    return true // keep channel open for async response
  }
  if (message.action === 'LOG_APPLICATION') {
    logApplication(message.payload).then(() => sendResponse({ ok: true }))
    return true
  }
})

async function handleFill(candidateId: string, tabId: number) {
  try {
    const candidate = await getCandidate(candidateId)
    const result = await chrome.tabs.sendMessage(tabId, {
      action: 'INJECT_CANDIDATE',
      candidate,
    })
    return result
  } catch (err) {
    return { error: String(err) }
  }
}
```

---

## Phase 6 — Content Script

**Goal:** Listen for fill commands and run the form filler.

### 6.1 `src/content/autofill.ts`

```typescript
import { fillForm } from '../lib/fieldMatcher'
import type { Candidate } from '../lib/types'

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'INJECT_CANDIDATE') {
    const candidate: Candidate = message.candidate
    const report = fillForm(candidate)
    sendResponse(report)
  }
})
```

---

## Phase 7 — Popup UI

**Goal:** Build the candidate selector popup.

### 7.1 `src/popup/popup.html`

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <link rel="stylesheet" href="./popup.css" />
  </head>
  <body class="w-96 min-h-64 bg-white">
    <div id="root"></div>
    <script type="module" src="./Popup.tsx"></script>
  </body>
</html>
```

### 7.2 `src/popup/Popup.tsx`

```tsx
import { useEffect, useState } from 'react'
import { getCandidates } from '../lib/supabase'
import type { Candidate, FillReport } from '../lib/types'

type State = 'idle' | 'filling' | 'done' | 'error'

export default function Popup() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [state, setState] = useState<State>('idle')
  const [report, setReport] = useState<FillReport | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    getCandidates().then(setCandidates).catch(console.error)
  }, [])

  const filtered = candidates.filter(c =>
    `${c.first_name} ${c.last_name} ${c.email}`.toLowerCase().includes(search.toLowerCase())
  )

  const handleFill = async () => {
    if (!selected) return
    setState('filling')
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      const result = await chrome.runtime.sendMessage({
        action: 'FILL_FORM',
        candidateId: selected,
        tabId: tab.id,
      })
      if (result.error) throw new Error(result.error)
      setReport(result)
      setState('done')
    } catch (err) {
      setError(String(err))
      setState('error')
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <span className="font-semibold text-gray-800">🤖 Job Autofill</span>
        <button
          onClick={() => chrome.runtime.openOptionsPage()}
          className="text-xs text-blue-600 hover:underline"
        >
          Manage Candidates
        </button>
      </div>

      {state === 'idle' && (
        <>
          <div className="px-4 py-2">
            <input
              type="text"
              placeholder="🔍 Search candidates..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex-1 overflow-y-auto px-2">
            {filtered.map(c => (
              <div
                key={c.id}
                onClick={() => setSelected(c.id)}
                className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer mb-1 ${
                  selected === c.id ? 'bg-blue-50 border border-blue-300' : 'hover:bg-gray-50'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
                  {c.first_name[0]}{c.last_name[0]}
                </div>
                <div>
                  <div className="font-medium text-sm text-gray-800">{c.first_name} {c.last_name}</div>
                  <div className="text-xs text-gray-500">{c.email} · {c.visa_status ?? (c.work_auth ? 'Authorized' : 'Needs Auth')}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="px-4 py-3 border-t">
            <button
              onClick={handleFill}
              disabled={!selected}
              className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium text-sm disabled:opacity-40 hover:bg-blue-700 transition"
            >
              ▶ Fill Form
            </button>
          </div>
        </>
      )}

      {state === 'filling' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-600">Filling form...</p>
        </div>
      )}

      {state === 'done' && report && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
          <div className="text-4xl">✅</div>
          <p className="text-sm font-medium text-gray-800">Form filled successfully</p>
          <div className="text-xs text-gray-500 text-center space-y-1">
            <p>✅ {report.filled} fields filled</p>
            <p>⏭ {report.skipped} skipped</p>
            {report.needsReview.length > 0 && (
              <p>🟡 {report.needsReview.length} need your review</p>
            )}
          </div>
          <button onClick={() => { setState('idle'); setReport(null); setSelected(null) }}
            className="text-xs text-blue-600 hover:underline">
            Fill another
          </button>
        </div>
      )}

      {state === 'error' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6">
          <div className="text-4xl">❌</div>
          <p className="text-sm text-red-600">{error}</p>
          <button onClick={() => setState('idle')} className="text-xs text-blue-600 hover:underline">
            Try again
          </button>
        </div>
      )}
    </div>
  )
}
```

---

## Phase 8 — Claude Integration

**Goal:** Generate tailored answers for custom application questions.

### 8.1 `src/lib/claude.ts`

```typescript
import type { Candidate } from './types'

const getApiKey = (): Promise<string> =>
  new Promise(resolve => chrome.storage.local.get('claudeApiKey', r => resolve(r.claudeApiKey)))

export const generateAnswer = async (question: string, candidate: Candidate): Promise<string> => {
  const apiKey = await getApiKey()
  const context = `
Candidate: ${candidate.first_name} ${candidate.last_name}
Title: ${candidate.job_title ?? 'Not specified'}
Experience: ${candidate.years_exp ?? '?'} years
Education: ${candidate.degree ?? ''} in ${candidate.field_of_study ?? ''} from ${candidate.university ?? ''}
${candidate.qa?.map(qa => `Q: ${qa.question}\nA: ${qa.answer}`).join('\n\n') ?? ''}
  `.trim()

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{
        role: 'user',
        content: `You are writing a job application answer on behalf of a candidate. Be genuine, specific, and concise (2-4 sentences max).

Candidate background:
${context}

Question to answer:
"${question}"

Write only the answer, no preamble.`
      }]
    })
  })

  const data = await response.json()
  return data.content[0].text
}
```

---

## Phase 9 — Settings & First-Time Setup

**Goal:** Let the user enter their Supabase + Claude API keys once via the options page.

Add a Settings tab to the options page that saves keys to `chrome.storage.local`:

```typescript
const saveSettings = (supabaseUrl: string, supabaseKey: string, claudeApiKey: string) => {
  chrome.storage.local.set({ supabaseUrl, supabaseKey, claudeApiKey })
}
```

---

## Phase 10 — Build & Load in Chrome

**Goal:** See it running in your browser.

```bash
npm run build
```

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `dist/` folder
5. Click the extension icon → enter your Supabase and Claude keys in Settings
6. Go to Options → add your first candidate
7. Navigate to any job application page
8. Click the extension → select the candidate → click **Fill Form**

---

## Milestone Checklist

- [ ] Phase 1 — Project scaffolded and builds without errors
- [ ] Phase 2 — Supabase schema created, tables visible in dashboard
- [ ] Phase 3 — Can query candidates from extension console
- [ ] Phase 4 — `fillForm()` fills a test HTML form correctly
- [ ] Phase 5 — Background worker passes messages between popup and tab
- [ ] Phase 6 — Content script receives candidate and runs filler
- [ ] Phase 7 — Popup shows candidates, fill button works end-to-end
- [ ] Phase 8 — Claude generates a sensible answer for a custom question
- [ ] Phase 9 — API keys persist across browser sessions
- [ ] Phase 10 — First real job application submitted in < 45 seconds 🎉

---

## Common Issues

| Problem | Fix |
|---|---|
| Form fields not filling | ATS uses shadow DOM — add `shadowRoot` traversal to `fillForm()` |
| Values not sticking | ATS form uses React — ensure `input` + `change` + `blur` all fire |
| Extension not loading | Check manifest.json for JSON syntax errors |
| Supabase 401 error | Re-check anon key in extension settings |
| Claude returning empty | Check API key and model string `claude-sonnet-4-6` |
