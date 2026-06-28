import { createClient } from '@supabase/supabase-js'
import type { Candidate, Application, CandidateCredential } from './types'

const getKeys = async () => {
  return new Promise<{ url: string; key: string }>((resolve) => {
    chrome.storage.local.get(['supabaseUrl', 'supabaseKey'], (result: any) => {
      resolve({ url: result.supabaseUrl, key: result.supabaseKey })
    })
  })
}

export const getSupabase = async () => {
  const { url, key } = await getKeys()
  if (!url || !key) {
    throw new Error('Supabase credentials not configured in extension settings.')
  }
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

export const getCredentials = async (candidateId: string): Promise<CandidateCredential[]> => {
  const supabase = await getSupabase()
  const { data, error } = await supabase
    .from('candidate_credentials')
    .select('*')
    .eq('candidate_id', candidateId)
  if (error) throw error
  return data ?? []
}
