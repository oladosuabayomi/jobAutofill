# DESIGN.md — UI/UX & Architecture Design

## Design Philosophy

- **Minimal friction** — the extension should get out of your way
- **One-click filling** — the core action must be a single click
- **Human-in-the-loop** — automation handles the repetitive 90%, you handle the judgment 10%
- **Clear feedback** — always show what was filled, what was skipped, and what needs attention

---

## Extension Entry Points

Chrome extensions have three distinct UI surfaces. Here's how each is used:

| Surface | File | Purpose |
|---|---|---|
| **Popup** | `popup.html` | Opened by clicking the extension icon. Select a candidate and trigger autofill. |
| **Options Page** | `options.html` | Full-screen dashboard. Add, edit, delete candidates. Opened via right-click → Options. |
| **Content Script** | `autofill.ts` | Injected into job application pages. Does the actual form filling. Invisible to user. |

---

## Popup UI Design

The popup is the **primary daily-use interface**. It must be fast and simple.

### Layout (380px × 500px)

```
┌─────────────────────────────────────┐
│  🤖 Job Autofill           [⚙ Mgr]  │  ← Header + link to options
├─────────────────────────────────────┤
│  [ Autofill ] [ Credentials ]       │  ← Tab Navigation
├─────────────────────────────────────┤
│  🔍 Search candidates...            │  ← Filter input
├─────────────────────────────────────┤
│  ○ John Doe                         │
│    john@email.com · OPT · React Dev │
│                                     │
│  ○ Jane Smith                       │
│    jane@email.com · H1B · PM        │
│                                     │
│  ○ Alex Kim                         │
│    alex@email.com · Citizen · DS    │
├─────────────────────────────────────┤
│         [ ▶ Fill Form ]             │  ← Primary CTA (disabled until selected)
└─────────────────────────────────────┘
```

### Popup States

**Default** — no candidate selected, Fill Form button disabled

**Candidate selected** — row highlighted, Fill Form button active

**Filling** — spinner, "Filling form..." message, button disabled

**Done** — green checkmark, summary: "✅ 14 fields filled · 2 skipped · 1 needs review"

**Error** — red alert, error message, retry button

### Credentials Vault Flow

For managing platform logins securely:
1. **First time on a new platform**: User creates account manually. Extension detects successful registration, prompts "Save these credentials?", and saves email + **encrypted** password.
2. **Next time on the same platform**: Extension recognizes the login page, fetches stored credentials for the selected candidate, decrypts locally, and autofills the email + password fields.

*Security Note: Passwords are encrypted/decrypted client-side using the Web Crypto API. The master key lives in `chrome.storage.local`.*

---

## Options Page (Dashboard) Design

The options page is the **setup interface**. Used less frequently but needs full functionality.

### Layout

```
┌──────────────────────────────────────────────────────────────┐
│  Job Autofill Dashboard                        [+ Add Candidate]
├────────────────┬─────────────────────────────────────────────┤
│                │                                             │
│  CANDIDATES    │  John Doe                    [Edit] [Delete]│
│                │  ─────────────────────────────────────────  │
│  ● John Doe    │  Basic Info                                 │
│  ○ Jane Smith  │  First Name: John    Last Name: Doe         │
│  ○ Alex Kim    │  Email: john@email.com                      │
│                │  Phone: +1 555-0100                         │
│  [+ Add New]   │  Location: Austin, TX                       │
│                │                                             │
│                │  Work Authorization                         │
│                │  Authorized: Yes  Sponsorship: No           │
│                │  Status: OPT (valid until 2026-08)          │
│                │                                             │
│                │  Professional                               │
│                │  LinkedIn: linkedin.com/in/johndoe          │
│                │  GitHub: github.com/johndoe                 │
│                │                                             │
│                │  Documents                                  │
│                │  📄 john_doe_resume.pdf        [Replace]    │
│                │  📄 john_doe_cover_letter.pdf  [Replace]    │
│                │  ➕ Add Other Document                      │
│                │                                             │
│                │  Custom Q&A                                 │
│                │  + Add Q&A Pair                             │
│                │  Q: Describe a challenge you solved...      │
│                │  A: At my previous role, I...               │
│                │                                             │
│                │  Application History          (12 total)    │
│                │  Acme Corp · SWE · Greenhouse · Jun 10      │
│                │  Beta Inc · PM · Lever · Jun 9              │
└────────────────┴─────────────────────────────────────────────┘
```

### Add/Edit Candidate Form

A multi-step form organized into sections:
1. Basic Info (name, email, phone, location)
2. Professional (title, years of exp, LinkedIn, GitHub, portfolio)
3. Work Authorization (dropdowns + date picker)
4. Education (degree, field, university, grad year)
5. Documents Upload (Resume, Cover Letter, Other PDFs)
6. Demographics (EEO Fields — Optional, includes "Decline to self-identify")
7. Custom Q&A (dynamic list of question-answer pairs)

---

## Autofill Flow Design (Content Script)

This is what happens when you click "Fill Form" in the popup.

### Step-by-step

```
User clicks "Fill Form"
        │
        ▼
Popup sends message to background service worker
{ action: "FILL_FORM", candidateId: "uuid" }
        │
        ▼
Background fetches candidate from Supabase
        │
        ▼
Background sends candidate payload to active tab content script
        │
        ▼
Content script runs fieldMatcher.ts on the current page DOM
        │
        ├─ For each visible input / textarea / select:
        │     → Normalize label text (lowercase, trim)
        │     → Check against field pattern registry
        │     → If match found: inject value + dispatch input/change/blur events
        │     → If no match: skip (highlight yellow for manual review)
        │
        ▼
Content script returns fill report to popup
{ filled: 14, skipped: 2, needsReview: ["Why do you want to work here?"] }
        │
        ▼
Popup shows result summary
```

### Field Highlighting

| State | Visual |
|---|---|
| Successfully filled | Brief green border flash (2s) |
| Skipped (no match) | No change |
| Needs review (custom question) | Persistent yellow border + tooltip "Click AI assist" |

---

## LLM Custom Answer Flow

When the content script encounters an unmatched textarea (likely a custom question):

```
Content script detects unmatched textarea
        │
        ▼
Adds yellow highlight + floating "✨ Generate Answer" button
        │
        ▼ (user clicks button)
        │
Grabs: question label text + surrounding job description meta
        │
        ▼
Sends to Claude API with candidate context:
  - candidate.customQA (their pre-saved answers)
  - candidate.workHistory
  - question text
        │
        ▼
Claude returns tailored answer
        │
        ▼
Answer is inserted into the textarea
User reviews → edits if needed → proceeds
```

---

## Field Matcher Architecture

The universal matcher (`fieldMatcher.ts`) works by:

1. **Collecting all inputs** — queries all `input`, `textarea`, `select` elements on the page (explicitly excluding `password` fields for safety)
2. **Extracting labels** — checks `<label for="">`, `aria-label`, `placeholder`, `name`, `id`, and surrounding `<span>` text
3. **Normalizing** — lowercases, removes punctuation, trims whitespace
4. **Pattern matching** — compares against the field registry
5. **Injecting** — sets `.value`, dispatches `input` + `change` + `blur` events (required for React/Vue-based ATS forms to register the change)

### Field Pattern Registry

```typescript
const FIELD_PATTERNS = [
  { key: "firstName",   patterns: ["first name", "firstname", "given name"] },
  { key: "lastName",    patterns: ["last name", "lastname", "surname", "family name"] },
  { key: "email",       patterns: ["email", "email address"] },
  { key: "phone",       patterns: ["phone", "mobile", "telephone", "cell"] },
  { key: "location",    patterns: ["city", "location", "current location"] },
  { key: "linkedin",    patterns: ["linkedin", "linkedin url", "linkedin profile"] },
  { key: "github",      patterns: ["github", "github url", "github profile"] },
  { key: "portfolio",   patterns: ["portfolio", "website", "personal website"] },
  { key: "workAuth",    patterns: ["authorized to work", "work authorization", "eligible to work"] },
  { key: "sponsorship", patterns: ["visa sponsorship", "require sponsorship", "sponsorship required"] },
  { key: "salary",      patterns: ["salary", "expected salary", "desired compensation"] },
  { key: "startDate",   patterns: ["start date", "available to start", "earliest start"] },
  // Extends easily — add new patterns without touching content script logic
]
```

---

## Supabase Schema Design

### Table: `candidates`

```sql
create table candidates (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz default now(),
  first_name    text not null,
  last_name     text not null,
  email         text not null,
  phone         text,
  location      text,
  linkedin_url  text,
  github_url    text,
  portfolio_url text,
  job_title     text,
  years_exp     int,
  degree        text,
  field_of_study text,
  university    text,
  grad_year     int,
  work_auth     boolean default false,
  requires_sponsorship boolean default false,
  visa_status   text,
  non_compete   boolean default false,
  resume_url    text,
  cover_letter_url text,
  other_doc_url text,
  gender text,
  pronouns text,
  ethnicity text,
  race text,
  disability_status text,
  veteran_status text,
  marital_status text,
  religion text,
  date_of_birth date,
  nationality text
);
```

### Table: `candidate_qa`

```sql
create table candidate_qa (
  id           uuid primary key default gen_random_uuid(),
  candidate_id uuid references candidates(id) on delete cascade,
  question     text not null,
  answer       text not null
);
```

### Table: `applications`

```sql
create table applications (
  id           uuid primary key default gen_random_uuid(),
  candidate_id uuid references candidates(id) on delete cascade,
  company      text not null,
  job_title    text,
  platform     text,
  applied_at   timestamptz default now(),
  status       text default 'submitted'
);
```

### Table: `candidate_credentials`

```sql
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

### Storage Bucket: `documents`

- Private bucket
- Files named: `{candidate_id}/resume.pdf`, `{candidate_id}/cover_letter.pdf`, `{candidate_id}/other.pdf`
- Accessed via signed URLs (1-hour expiry)
