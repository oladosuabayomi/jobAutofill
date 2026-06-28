# Job Autofill Chrome Extension — Progress Tracker

This document tracks the end-to-end implementation progress of the Job Autofill Chrome Extension based on `DESIGN.md`, `IMPLEMENTATION.md`, and `project-doc.md`. 

*Note: As per project guidelines, all dependencies must be installed using their latest standard versions unless explicitly restricted.*

---

## Phase 1: Project Scaffold ✅
*Goal: Get the project structure and build pipeline running.*
- [x] Create project with Vite (`react-ts` template)
- [x] Install dependencies (`@supabase/supabase-js`, `@crxjs/vite-plugin`, `tailwindcss`, `autoprefixer`, `postcss`) *Note: verify Vite version compatibility for CRXJS.*
- [x] Initialize TailwindCSS
- [x] Configure `vite.config.ts` with CRXJS plugin
- [x] Create `manifest.json` (MV3)
- [x] Set up folder structure (`src/popup`, `src/options`, `src/content`, `src/background`, `src/lib`)

---

## Phase 2: Supabase Setup ✅
*Goal: Get the database running with the correct schema and storage.*
- [x] Create Supabase project
- [x] Run SQL schema script (`candidates`, `candidate_qa`, `applications`)
- [x] Run SQL schema script for Credentials Vault (`candidate_credentials`)
- [x] Create `documents` storage bucket (for resumes, cover letters, and other docs)
- [x] Enable Row Level Security (RLS) and setup initial open policies for all 4 tables

---

## Phase 3: Supabase Client & Types ✅
*Goal: Create shared types and the database client.*
- [x] Create `src/lib/types.ts` (Include `CandidateCredential` interface)
- [x] Create `src/lib/supabase.ts` (Include `saveCredential` implementation)

---

## Phase 4: Credentials Encryption (Crypto Utility) ✅
*Goal: Provide secure, client-side encryption using the native Web Crypto API.*
- [x] Create `src/lib/crypto.ts`
- [x] Implement `encryptPassword` with `AES-GCM`
- [x] Implement `decryptPassword` with `AES-GCM`

---

## Phase 5: Field Matcher (Core Engine) ✅
*Goal: Build the universal DOM pattern matcher.*
- [x] Create `src/lib/fieldMatcher.ts`
- [x] Define `FIELD_PATTERNS` registry (including all EEO and demographic fields)
- [x] Implement `getLabel` for DOM traversal
- [x] Implement `injectValue` to handle native inputs, `select`, `radio`, `checkbox`, and custom `div`-based dropdowns
- [x] Implement `fillForm` with exclusion logic (`:not([type="password"])`)

---

## Phase 6: Background Service Worker ✅
*Goal: Bridge messages between popup and content script.*
- [x] Create `src/background/service-worker.ts`
- [x] Implement message listeners for `FILL_FORM` and `LOG_APPLICATION`
- [x] Implement `handleFill` function

---

## Phase 7: Content Script ✅
*Goal: Listen for fill commands and run the form filler on job pages.*
- [x] Create `src/content/autofill.ts`
- [x] Setup message listener for `INJECT_CANDIDATE`

---

## Phase 8: Popup UI ⏳
*Goal: Build the candidate selector and credentials popup.*
- [ ] Create `src/popup/popup.html`
- [ ] Build `src/popup/Popup.tsx`
- [ ] Implement candidate search and list UI
- [ ] Implement dual-tab system (`[ Autofill ] [ Credentials ]`)
- [ ] Wire up form fill messaging to background script

---

## Phase 9: Claude API Integration ⏳
*Goal: Generate tailored answers for custom application questions.*
- [ ] Create `src/lib/claude.ts`
- [ ] Implement `generateAnswer` using Claude API (`claude-sonnet-4-6`)
- [ ] Create floating "AI Assist" button inside the content script for unmatched textareas

---

## Phase 10: Options Page & Dashboard ⏳
*Goal: Build the candidate management dashboard and settings.*
- [ ] Create `src/options/options.html`
- [ ] Build `src/options/Options.tsx`
- [ ] Build UI to add/edit/delete Candidates
- [ ] Build Demographics section in Candidate form (EEO fields, optional)
- [ ] Build Settings UI for configuring API keys (Supabase + Claude) and Master Encryption Key

---

## Phase 11: End-to-End Build & Test ⏳
*Goal: Verify the extension in the browser.*
- [ ] Run `npm run build`
- [ ] Load unpacked extension in Chrome `chrome://extensions`
- [ ] Setup initial API keys via Settings tab
- [ ] Add a test candidate
- [ ] Successfully fill a test form/job application
- [ ] Successfully encrypt and save platform credentials
