# Job Autofill Chrome Extension — Project Documentation

## Overview

A Chrome Extension built with React + TypeScript that automates job application form filling across any ATS platform. Candidate data is stored securely in Supabase and injected into job application forms via a universal field-matching content script. An integrated Claude API generates tailored answers to custom application questions.

---

## Problem Statement

Manually applying to jobs on behalf of candidates is:
- Repetitive (same fields on every platform)
- Time-consuming (5+ minutes per application)
- Error-prone (copy-paste mistakes)
- Not scalable (bottleneck grows with candidate count)

---

## Goals

- Reduce time-per-application from ~5 minutes to ~30 seconds
- Work on **any** job platform without platform-specific code
- Keep candidate data secure and centralized
- Support LLM-generated answers for custom text questions
- Track all submitted applications per candidate

---

## Tech Stack

| Layer | Technology | Reason |
|---|---|---|
| Extension UI | React + TypeScript | Component-based, type-safe |
| Extension Platform | Chrome MV3 | Current standard, secure |
| Styling | Tailwind CSS | Fast utility-first styling |
| Database | Supabase (PostgreSQL) | Free, hosted, REST API included |
| File Storage | Supabase Storage | Resume PDF hosting |
| LLM Integration | Claude API (claude-sonnet-4-6) | Custom answer generation |
| Build Tool | Vite + CRXJS | Fast Chrome Extension builds |

---

## Project Scope

### In Scope
- Universal autofill content script (works on any ATS)
- Candidate management dashboard (options page)
- Candidate selector popup
- Resume, Cover Letter, and Document PDF upload and storage
- Claude-powered custom answer generation
- Application logging per candidate
- Credentials Vault (encrypted platform passwords per candidate)

### Out of Scope (Future)
- Fully automated headless browser submission
- Multi-user / team access
- LinkedIn scraping or job discovery
- Email follow-up automation

---

## Candidate Data Model

Each candidate profile stores:

**Basic Info**
- First name, Last name
- Email address
- Phone number
- Location (city, state, country)

**Professional**
- LinkedIn URL
- GitHub URL
- Portfolio/website URL
- Current job title
- Years of experience

**Work Authorization**
- Authorized to work in US (yes/no)
- Requires visa sponsorship (yes/no)
- OPT/visa status (if applicable)
- Non-compete agreement (yes/no)

**Education**
- Highest degree
- Field of study
- University name
- Graduation year

**Documents**
- Resume PDF (stored in Supabase Storage)
- Cover Letter PDF (optional)
- Other Docs (e.g., portfolio/references, optional)
- Public URLs for form uploads

**Demographics (EEO Fields - Optional)**
- Gender / Pronouns
- Race / Ethnicity
- Disability status / Veteran status
- Marital status / Religion
- Date of birth / Nationality

**Custom Q&A**
- Freeform question-answer pairs
- Used as context for LLM-generated answers

**Application Log**
- Company name
- Job title
- Platform used
- Date submitted
- Status

**Platform Credentials (Credentials Vault)**
- Platform name & URL
- Login email
- Encrypted password
- Custom notes

---

## Supported Platforms

The universal matcher targets field patterns by label text, input name, placeholder, and ID attributes. It natively handles text inputs, textareas, native `<select>` dropdowns, radio buttons, checkboxes, and attempts to handle custom `div`-based dropdowns. It works on — but is not limited to:

- Greenhouse (boards.greenhouse.io)
- Lever (jobs.lever.co)
- Workday (*.workday.com)
- Any custom company careers page

---

## Universal Form Support (Registration, Login, Applications)

The tool doesn't care **why** a page is asking for first name, last name, email, etc. The content script just scans whatever fields are visible in the DOM and fills what it recognizes.

So it works on:
- **Registration forms** — first name, last name, email, phone → all match existing patterns in `fieldMatcher.ts`, filled automatically
- **Login forms** — email field matches, done
- **Job application forms** — same engine, same patterns
- **Any form on any page** — same universal matcher

**The only field it can't handle is password**
That's intentional. You wouldn't want a password auto-generated and injected without you seeing it. The flow there would be:
1. Extension fills name, email, phone on the registration form
2. You type the password manually (or use your password manager)
3. Done

---

## Repository Structure

```
job-autofill-extension/
├── public/
│   └── icons/                  # Extension icons (16, 48, 128px)
├── src/
│   ├── popup/                  # Extension popup (candidate selector)
│   │   ├── Popup.tsx
│   │   └── popup.html
│   ├── options/                # Candidate management dashboard
│   │   ├── Options.tsx
│   │   ├── CandidateForm.tsx
│   │   ├── CandidateList.tsx
│   │   └── options.html
│   ├── content/
│   │   └── autofill.ts         # Universal form filler (runs on job pages)
│   ├── background/
│   │   └── service-worker.ts   # Handles messages between popup and content
│   └── lib/
│       ├── supabase.ts         # Supabase client + all DB queries
│       ├── claude.ts           # Claude API integration
│       ├── fieldMatcher.ts     # Universal DOM field matching logic
│       └── types.ts            # Shared TypeScript types
├── manifest.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Security Considerations

- Supabase keys stored in extension storage (not hardcoded)
- Row-level security enabled on all Supabase tables
- Resume PDFs stored in private Supabase bucket with signed URLs
- Claude API key stored in extension storage, never in source code
- No candidate data sent to third parties beyond Supabase + Claude API
- Passwords stored in `candidate_credentials` are encrypted **client-side** using the Web Crypto API before being sent to Supabase.
- Master encryption key is stored solely in `chrome.storage.local` and never leaves the user's browser.

---

## Success Metrics

| Metric | Target |
|---|---|
| Time per application | < 45 seconds |
| Form fill accuracy | > 90% fields auto-matched |
| Platforms it works on | Any standard ATS |
| Candidates supported | 1 – 500+ |
