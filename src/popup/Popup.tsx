import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { getCandidates, getCredentials } from '../lib/supabase'
import type { Candidate, FillReport, CandidateCredential } from '../lib/types'
import { 
  Bot, Settings, Search, Copy, Check, Play, SkipForward, AlertCircle, XCircle, 
  ChevronDown, ChevronRight, CheckCircle2, Key, Loader2, UserCircle2 
} from 'lucide-react'

type Tab = 'autofill' | 'credentials'
type State = 'idle' | 'filling' | 'done' | 'error'

const CopyField = ({ label, value }: { label: string, value: string }) => {
  const [copied, setCopied] = useState(false)
  return (
    <div className="flex justify-between items-start gap-2 group py-1">
      <div className="flex-1 min-w-0">
        <span className="text-gray-500 font-medium mr-1">{label}:</span>
        <span className="text-gray-800 break-words whitespace-pre-wrap">{value}</span>
      </div>
      <button 
        onClick={() => {
          navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }}
        className="text-gray-400 hover:text-blue-600 focus:outline-none flex-shrink-0 mt-0.5"
        title="Copy"
      >
        {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
      </button>
    </div>
  )
}

const Accordion = ({ title, isOpen, onToggle, children }: { title: string, isOpen: boolean, onToggle: () => void, children: React.ReactNode }) => {
  return (
    <div className="border border-blue-100 rounded-lg bg-white overflow-hidden mb-2">
      <button 
        onClick={onToggle}
        className="w-full px-3 py-2 flex items-center justify-between bg-blue-50 hover:bg-blue-100 transition-colors focus:outline-none"
      >
        <span className="font-semibold text-blue-800 text-xs">{title}</span>
        {isOpen ? <ChevronDown size={14} className="text-blue-600" /> : <ChevronRight size={14} className="text-blue-600" />}
      </button>
      {isOpen && (
        <div className="p-3 bg-white text-xs space-y-1">
          {children}
        </div>
      )}
    </div>
  )
}

export default function Popup() {
  const [activeTab, setActiveTab] = useState<Tab>('autofill')
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  
  const [state, setState] = useState<State>('idle')
  const [report, setReport] = useState<FillReport | null>(null)
  const [error, setError] = useState('')
  
  const [credentials, setCredentials] = useState<CandidateCredential[]>([])
  const [openAccordion, setOpenAccordion] = useState<string>('personal')

  useEffect(() => {
    getCandidates().then(setCandidates).catch(console.error)
  }, [])

  useEffect(() => {
    if (selected && activeTab === 'credentials') {
      getCredentials(selected).then(setCredentials).catch(console.error)
    }
  }, [selected, activeTab])

  const filtered = candidates.filter(c =>
    `${c.first_name} ${c.last_name} ${c.email}`.toLowerCase().includes(search.toLowerCase())
  )

  const handleFill = async () => {
    if (!selected) return
    setState('filling')
    try {
      const selectedCandidate = candidates.find(c => c.id === selected)
      if (selectedCandidate) {
        await chrome.storage.local.set({ 
          activeCandidateId: selected,
          activeCandidateName: `${selectedCandidate.first_name} ${selectedCandidate.last_name}`
        })
      }

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab.id) throw new Error('No active tab')
      const result = await chrome.runtime.sendMessage({
        action: 'FILL_FORM',
        candidateId: selected,
        tabId: tab.id,
      })
      if (result?.error) throw new Error(result.error)
      setReport(result)
      setState('done')
    } catch (err) {
      setError(String(err))
      setState('error')
    }
  }

  return (
    <div className="flex flex-col h-[600px] w-[400px] bg-white text-gray-900 shadow-xl overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white sticky top-0 z-20">
        <span className="font-bold text-gray-900 flex items-center gap-2">
          <Bot size={20} className="text-blue-600" /> Job Autofill
        </span>
        <button
          onClick={() => chrome.runtime.openOptionsPage()}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 font-medium hover:bg-gray-100 px-2 py-1 rounded transition-colors focus:outline-none"
        >
          <Settings size={14} /> Manage
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100 bg-gray-50 z-10">
        <button
          onClick={() => setActiveTab('autofill')}
          className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2 focus:outline-none transition-all duration-200 ${activeTab === 'autofill' ? 'border-b-2 border-blue-600 text-blue-700 bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 border-b-2 border-transparent'}`}
        >
          <UserCircle2 size={16} /> Autofill
        </button>
        <button
          onClick={() => setActiveTab('credentials')}
          className={`flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2 focus:outline-none transition-all duration-200 ${activeTab === 'credentials' ? 'border-b-2 border-blue-600 text-blue-700 bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100 border-b-2 border-transparent'}`}
        >
          <Key size={16} /> Credentials
        </button>
      </div>

      {state === 'idle' && (
        <div className="flex flex-col flex-1 overflow-hidden bg-white">
          <div className="px-4 py-3 border-b border-gray-100 bg-white">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search candidates..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all bg-gray-50 focus:bg-white placeholder-gray-400"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-2 bg-gray-50/30 custom-scrollbar">
            {filtered.length === 0 ? (
              <div className="text-center text-sm text-gray-500 mt-8 flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                  <Search size={20} className="text-gray-400" />
                </div>
                No candidates found
              </div>
            ) : (
              filtered.map(c => (
                <div
                  key={c.id}
                  className={`flex flex-col p-3 rounded-xl cursor-pointer mb-2 transition-all duration-200 ${
                    selected === c.id ? 'bg-white border-2 border-blue-500 shadow-md transform scale-[1.01]' : 'bg-white border-2 border-transparent hover:border-gray-200 hover:shadow-sm border border-gray-100'
                  }`}
                >
                  <div className="flex items-start gap-3" onClick={() => setSelected(selected === c.id ? null : c.id)}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-sm transition-colors ${selected === c.id ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                      {c.first_name[0]}{c.last_name[0]}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <div className="font-semibold text-sm text-gray-900 truncate">{c.first_name} {c.last_name}</div>
                      <div className="text-xs text-gray-500 truncate">{c.email}</div>
                      <div className="text-[11px] font-medium text-blue-600 mt-1 truncate">{c.job_title ?? 'No title'}</div>
                    </div>
                  </div>
                  
                  {selected === c.id && (
                    <div className="mt-4 pt-3 border-t border-gray-100 cursor-default" onClick={e => e.stopPropagation()}>
                      <Accordion 
                        title="Personal Info" 
                        isOpen={openAccordion === 'personal'} 
                        onToggle={() => setOpenAccordion(openAccordion === 'personal' ? '' : 'personal')}
                      >
                        <div className="grid grid-cols-1 gap-1">
                          {c.first_name && <CopyField label="First Name" value={c.first_name} />}
                          {c.last_name && <CopyField label="Last Name" value={c.last_name} />}
                          {c.email && <CopyField label="Email" value={c.email} />}
                          {c.phone && <CopyField label="Phone" value={c.phone} />}
                          {c.location && <CopyField label="Location" value={c.location} />}
                          {c.city && <CopyField label="City" value={c.city} />}
                          {c.state && <CopyField label="State" value={c.state} />}
                          {c.postal_code && <CopyField label="Postal Code" value={c.postal_code} />}
                          {c.date_of_birth && <CopyField label="DOB" value={c.date_of_birth} />}
                          {c.username && <CopyField label="Username" value={c.username} />}
                          {c.default_password && <CopyField label="Default Password" value={c.default_password} />}
                          {c.salary_expectation && <CopyField label="Salary Expectation" value={c.salary_expectation} />}
                        </div>
                      </Accordion>

                      <Accordion 
                        title="Professional Links" 
                        isOpen={openAccordion === 'professional'} 
                        onToggle={() => setOpenAccordion(openAccordion === 'professional' ? '' : 'professional')}
                      >
                        <div className="grid grid-cols-1 gap-1">
                          {c.linkedin_url && <CopyField label="LinkedIn" value={c.linkedin_url} />}
                          {c.portfolio_url && <CopyField label="Portfolio" value={c.portfolio_url} />}
                          {c.github_url && <CopyField label="GitHub" value={c.github_url} />}
                        </div>
                      </Accordion>
                      
                      <Accordion 
                        title="Demographics & Identity" 
                        isOpen={openAccordion === 'demographics'} 
                        onToggle={() => setOpenAccordion(openAccordion === 'demographics' ? '' : 'demographics')}
                      >
                        <div className="grid grid-cols-1 gap-1">
                          {c.gender && <CopyField label="Gender" value={c.gender} />}
                          {c.pronouns && <CopyField label="Pronouns" value={c.pronouns} />}
                          {c.ethnicity && <CopyField label="Ethnicity" value={c.ethnicity} />}
                          {c.race && <CopyField label="Race" value={c.race} />}
                          {c.disability_status && <CopyField label="Disability Status" value={c.disability_status} />}
                          {c.veteran_status && <CopyField label="Veteran Status" value={c.veteran_status} />}
                          {c.marital_status && <CopyField label="Marital Status" value={c.marital_status} />}
                          {c.religion && <CopyField label="Religion" value={c.religion} />}
                          {c.nationality && <CopyField label="Nationality" value={c.nationality} />}
                        </div>
                      </Accordion>

                      <Accordion 
                        title="Work Authorization" 
                        isOpen={openAccordion === 'authorization'} 
                        onToggle={() => setOpenAccordion(openAccordion === 'authorization' ? '' : 'authorization')}
                      >
                        <div className="grid grid-cols-1 gap-1">
                          <CopyField label="Authorized to Work" value={c.work_auth ? 'Yes' : 'No'} />
                          <CopyField label="Requires Sponsorship" value={c.requires_sponsorship ? 'Yes' : 'No'} />
                          {c.visa_status && <CopyField label="Visa Status" value={c.visa_status} />}
                          <CopyField label="Subject to Non-Compete" value={c.non_compete ? 'Yes' : 'No'} />
                        </div>
                      </Accordion>

                      {(c.resume_url || c.cover_letter_url || c.other_doc_url) && (
                        <Accordion 
                          title="Documents" 
                          isOpen={openAccordion === 'documents'} 
                          onToggle={() => setOpenAccordion(openAccordion === 'documents' ? '' : 'documents')}
                        >
                          <div className="grid grid-cols-1 gap-1">
                            {c.resume_url && <CopyField label="Resume" value={c.resume_url} />}
                            {c.cover_letter_url && <CopyField label="Cover Letter" value={c.cover_letter_url} />}
                            {c.other_doc_url && <CopyField label="Other Doc" value={c.other_doc_url} />}
                          </div>
                        </Accordion>
                      )}

                      {(c.work_experiences || []).length > 0 && (
                        <Accordion 
                          title="Experience" 
                          isOpen={openAccordion === 'experience'} 
                          onToggle={() => setOpenAccordion(openAccordion === 'experience' ? '' : 'experience')}
                        >
                          {c.work_experiences?.map((w, i) => (
                            <div key={i} className="mb-3 last:mb-0 border-b border-gray-100 last:border-0 pb-2 last:pb-0">
                              {w.company && <CopyField label="Company" value={w.company} />}
                              {w.job_title && <CopyField label="Role" value={w.job_title} />}
                              {w.location && <CopyField label="Location" value={w.location} />}
                              {w.start_date && <CopyField label="Start" value={w.start_date} />}
                              {w.end_date && <CopyField label="End" value={w.end_date} />}
                              {w.is_current !== undefined && <CopyField label="Current" value={w.is_current ? 'Yes' : 'No'} />}
                              {w.description && <CopyField label="Description" value={w.description} />}
                            </div>
                          ))}
                        </Accordion>
                      )}

                      {((c.education || []).length > 0) ? (
                        <Accordion 
                          title="Education Details" 
                          isOpen={openAccordion === 'education'} 
                          onToggle={() => setOpenAccordion(openAccordion === 'education' ? '' : 'education')}
                        >
                          {c.education?.map((ed, i) => (
                            <div key={i} className="mb-2 last:mb-0 border-b border-gray-100 last:border-0 pb-2 last:pb-0">
                              <div className="font-medium text-gray-800 mb-1">{ed.institution}</div>
                              <CopyField label="Degree" value={`${ed.degree}${ed.field_of_study ? ` in ${ed.field_of_study}` : ''}`} />
                              {ed.start_date && <CopyField label="Start" value={ed.start_date} />}
                              {ed.end_date && <CopyField label="End" value={ed.end_date} />}
                            </div>
                          ))}
                        </Accordion>
                      ) : (c.degree) ? (
                        <Accordion 
                          title="Education Details" 
                          isOpen={openAccordion === 'education'} 
                          onToggle={() => setOpenAccordion(openAccordion === 'education' ? '' : 'education')}
                        >
                           <div className="grid grid-cols-1 gap-1">
                              {c.university && <CopyField label="Institution" value={c.university} />}
                              {c.degree && <CopyField label="Degree" value={c.degree} />}
                              {c.field_of_study && <CopyField label="Field of Study" value={c.field_of_study} />}
                              {c.grad_year && <CopyField label="Grad Year" value={c.grad_year.toString()} />}
                           </div>
                        </Accordion>
                      ) : null}

                      {((c.skills || []).length > 0 || c.years_exp) && (
                        <Accordion 
                          title="Skills & Experience" 
                          isOpen={openAccordion === 'skills'} 
                          onToggle={() => setOpenAccordion(openAccordion === 'skills' ? '' : 'skills')}
                        >
                          <div className="grid grid-cols-1 gap-1">
                            {c.years_exp && <CopyField label="Total Years Exp" value={c.years_exp.toString()} />}
                            {c.skills?.map((s, i) => (
                              <CopyField key={i} label={s.name} value={s.years ? `${s.years} years` : 'Yes'} />
                            ))}
                          </div>
                        </Accordion>
                      )}

                      {(c.qa || []).length > 0 && (
                        <Accordion 
                          title="Custom Q&A" 
                          isOpen={openAccordion === 'qa'} 
                          onToggle={() => setOpenAccordion(openAccordion === 'qa' ? '' : 'qa')}
                        >
                          <div className="grid grid-cols-1 gap-1">
                            {c.qa?.map((q, i) => (
                              <CopyField key={i} label={q.question} value={q.answer} />
                            ))}
                          </div>
                        </Accordion>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {activeTab === 'autofill' && (
            <div className="px-4 py-3 border-t border-gray-100 bg-white shadow-[0_-4px_15px_-3px_rgba(0,0,0,0.05)] z-10">
              <button
                onClick={handleFill}
                disabled={!selected}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 active:bg-blue-800 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <Play size={16} className={!selected ? 'opacity-50' : ''} /> Fill Application Form
              </button>
            </div>
          )}

          {activeTab === 'credentials' && selected && (
             <div className="h-[280px] border-t border-gray-100 bg-gray-50 overflow-y-auto p-4 z-10 shadow-[0_-4px_15px_-3px_rgba(0,0,0,0.05)]">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Key size={12} /> Saved Platforms
                </h4>
                {credentials.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 bg-white rounded-xl border border-gray-200 shadow-sm gap-2">
                    <Key size={20} className="text-gray-300" />
                    <p className="text-xs text-gray-500">No credentials saved yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {credentials.map(cred => (
                      <div key={cred.id} className="flex flex-col bg-white p-3 rounded-xl border border-gray-200 shadow-sm hover:shadow transition-shadow">
                        <div className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2 mb-2 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          {cred.platform}
                        </div>
                        <div className="space-y-1">
                          <CopyField label="Email" value={cred.email} />
                          <div className="flex justify-between items-center gap-2 group py-1">
                            <div className="flex-1 min-w-0 flex items-center">
                              <span className="text-gray-500 font-medium mr-1 text-xs">Password:</span>
                              <span className="text-gray-400 italic text-xs tracking-widest mt-0.5">••••••••</span>
                            </div>
                            <button 
                              onClick={async (e) => {
                                const btn = e.currentTarget
                                const originalHtml = btn.innerHTML
                                try {
                                  btn.innerHTML = '<span class="flex items-center gap-1 text-blue-500"><svg class="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></span>'
                                  const { masterKey } = await chrome.storage.local.get('masterKey')
                                  if (!masterKey) throw new Error('No Master Key')
                                  const { decryptPassword } = await import('../lib/crypto')
                                  const plain = await decryptPassword(cred.password!, masterKey as string)
                                  navigator.clipboard.writeText(plain)
                                  btn.innerHTML = '<span class="flex items-center gap-1 text-green-500"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied</span>'
                                  setTimeout(() => btn.innerHTML = originalHtml, 2000)
                                } catch (err) {
                                  alert('Decryption failed! Is Master Key set?')
                                  btn.innerHTML = originalHtml
                                }
                              }}
                              className="text-gray-400 hover:text-blue-600 focus:outline-none text-xs font-medium flex items-center gap-1 transition-colors"
                            >
                              <Copy size={14} /> Copy
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
             </div>
          )}
        </div>
      )}

      {state === 'filling' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8 bg-white">
          <Loader2 size={48} className="text-blue-600 animate-spin" />
          <p className="text-sm text-gray-700 font-medium animate-pulse">Scanning & Filling Form...</p>
        </div>
      )}

      {state === 'done' && report && (
        <div className="flex-1 flex flex-col items-center justify-center gap-5 p-6 text-center bg-white">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-2">
            <CheckCircle2 size={40} className="text-green-500 drop-shadow-sm" />
          </div>
          <p className="text-xl font-bold text-gray-800 -mt-2">Form Filled Successfully</p>
          <div className="text-sm text-gray-700 space-y-3 bg-gray-50 p-5 rounded-2xl w-full border border-gray-100 shadow-inner">
            <div className="flex justify-between items-center"><span className="flex items-center gap-2 font-medium text-gray-600"><Check size={16} className="text-green-500" /> Filled Fields:</span> <span className="font-bold text-gray-900 text-base">{report.filled}</span></div>
            <div className="flex justify-between items-center"><span className="flex items-center gap-2 font-medium text-gray-600"><SkipForward size={16} className="text-gray-400" /> Skipped:</span> <span className="font-bold text-gray-900 text-base">{report.skipped}</span></div>
            {report.needsReview.length > 0 && (
              <div className="flex justify-between items-center text-yellow-700 pt-3 border-t border-gray-200 mt-2"><span className="flex items-center gap-2 font-medium"><AlertCircle size={16} /> Review Needed:</span> <span className="font-bold text-base">{report.needsReview.length}</span></div>
            )}
          </div>
          <button onClick={() => { setState('idle'); setReport(null); }}
            className="text-sm text-white bg-blue-600 hover:bg-blue-700 px-6 py-2.5 rounded-lg font-medium transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 mt-2 w-full">
            Fill another application
          </button>
        </div>
      )}

      {state === 'error' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-5 p-6 text-center bg-white">
          <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mb-2">
            <XCircle size={40} className="text-red-500 drop-shadow-sm" />
          </div>
          <p className="text-xl font-bold text-gray-800 -mt-2">Action Failed</p>
          <div className="bg-red-50 p-5 rounded-2xl border border-red-100 w-full text-left">
            <p className="text-sm font-medium text-red-700 break-words leading-relaxed">{error}</p>
          </div>
          <button onClick={() => setState('idle')} className="text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 px-6 py-2.5 rounded-lg font-medium transition-all w-full mt-2">
            Go back and try again
          </button>
        </div>
      )}
    </div>
  )
}

const root = createRoot(document.getElementById('root')!)
root.render(<Popup />)
