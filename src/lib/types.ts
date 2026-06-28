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
  // Phase 12 Additions
  salary_expectation?: string
  postal_code?: string
  state?: string
  city?: string
  default_password?: string
  username?: string
  work_experiences?: WorkExperience[]
  education?: Education[]
  skills?: Skill[]
}

export interface WorkExperience {
  company: string
  job_title: string
  location?: string
  start_date?: string
  end_date?: string
  is_current?: boolean
  description?: string
}

export interface Education {
  institution: string
  degree: string
  field_of_study?: string
  start_date?: string
  end_date?: string
}

export interface Skill {
  name: string
  years?: number
}

export interface QAPair {
  id?: string
  candidate_id?: string
  question: string
  answer: string
}

export interface Application {
  id: string
  candidate_id: string
  company: string
  job_title?: string
  platform?: string
  url?: string
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
