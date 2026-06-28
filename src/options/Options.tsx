import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { getCandidates, saveCandidate } from '../lib/supabase'
import type { Candidate } from '../lib/types'

type Tab = 'candidates' | 'credentials' | 'settings'
type AIProvider = 'claude' | 'openai' | 'gemini'

export default function Options() {
  const [activeTab, setActiveTab] = useState<Tab>('settings')
  
  // Settings State
  const [supaUrl, setSupaUrl] = useState('')
  const [supaKey, setSupaKey] = useState('')
  const [aiProvider, setAiProvider] = useState<AIProvider>('claude')
  const [aiKey, setAiKey] = useState('')
  const [masterKey, setMasterKey] = useState('')
  const [settingsSaved, setSettingsSaved] = useState(false)

  // Candidates State
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [editing, setEditing] = useState<Partial<Candidate> | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    chrome.storage.local.get(['supabaseUrl', 'supabaseKey', 'aiProvider', 'aiApiKey', 'masterKey'], (r: any) => {
      if (r.supabaseUrl) setSupaUrl(r.supabaseUrl)
      if (r.supabaseKey) setSupaKey(r.supabaseKey)
      if (r.aiProvider) setAiProvider(r.aiProvider)
      if (r.aiApiKey) setAiKey(r.aiApiKey)
      if (r.masterKey) setMasterKey(r.masterKey)
      
      if (r.supabaseUrl && r.supabaseKey) {
        setActiveTab('candidates')
        fetchData()
      }
    })
  }, [])

  const fetchData = async () => {
    try {
      const data = await getCandidates()
      setCandidates(data)
    } catch (e) {
      console.error(e)
    }
  }

  const saveSettings = () => {
    chrome.storage.local.set({
      supabaseUrl: supaUrl,
      supabaseKey: supaKey,
      aiProvider: aiProvider,
      aiApiKey: aiKey,
      masterKey: masterKey
    }, () => {
      setSettingsSaved(true)
      setTimeout(() => setSettingsSaved(false), 2000)
      fetchData()
    })
  }

  const handleSaveCandidate = async () => {
    if (!editing) return
    setLoading(true)
    try {
      await saveCandidate(editing)
      await fetchData()
      setEditing(null)
    } catch (e) {
      console.error(e)
      alert('Error saving candidate')
    }
    setLoading(false)
  }

  return (
    <div className="flex h-screen bg-gray-50 font-sans">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r shadow-sm flex flex-col">
        <div className="p-6 border-b flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xl font-bold shadow-md">A</div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Job Autofill</h1>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <button onClick={() => setActiveTab('candidates')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'candidates' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-100'}`}>👤 Candidates</button>
          <button onClick={() => setActiveTab('credentials')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'credentials' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-100'}`}>🔑 Vault</button>
          <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-100'}`}>⚙️ Settings</button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8">
        
        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Settings</h2>
              <p className="text-gray-500 mt-1">Configure your backend, AI integrations, and encryption.</p>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-5">
              <h3 className="text-lg font-semibold border-b pb-2">Supabase Configuration</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project URL</label>
                  <input type="text" value={supaUrl} onChange={e => setSupaUrl(e.target.value)} className="w-full border-gray-300 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" placeholder="https://xyz.supabase.co" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Anon Public Key</label>
                  <input type="password" value={supaKey} onChange={e => setSupaKey(e.target.value)} className="w-full border-gray-300 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-5">
              <h3 className="text-lg font-semibold border-b pb-2">AI Integrations</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                  <select value={aiProvider} onChange={e => setAiProvider(e.target.value as AIProvider)} className="w-full border-gray-300 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="claude">Anthropic (Claude)</option>
                    <option value="openai">OpenAI</option>
                    <option value="gemini">Google Gemini</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                  <input type="password" value={aiKey} onChange={e => setAiKey(e.target.value)} className="w-full border-gray-300 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-5">
              <h3 className="text-lg font-semibold border-b pb-2">Credentials Vault</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Master Encryption Key</label>
                <p className="text-xs text-gray-500 mb-2">Used to locally encrypt/decrypt platform passwords.</p>
                <input type="password" value={masterKey} onChange={e => setMasterKey(e.target.value)} className="w-full border-gray-300 border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" placeholder="SuperSecretKey123!" />
              </div>
            </div>

            <div className="flex items-center gap-4 pt-4">
              <button onClick={saveSettings} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm transition">
                Save Settings
              </button>
              {settingsSaved && <span className="text-green-600 font-medium">✅ Saved successfully!</span>}
            </div>
          </div>
        )}

        {/* Candidates Tab */}
        {activeTab === 'candidates' && !editing && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Candidates</h2>
                <p className="text-gray-500 mt-1">Manage profiles and demographic information.</p>
              </div>
              <button onClick={() => setEditing({ first_name: '', last_name: '', email: '', work_auth: true, requires_sponsorship: false, non_compete: false })} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg font-medium shadow-sm transition flex items-center gap-2">
                ➕ New Candidate
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {candidates.map(c => (
                <div key={c.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition cursor-pointer group" onClick={() => setEditing(c)}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-lg group-hover:bg-blue-600 group-hover:text-white transition">
                      {c.first_name[0]}{c.last_name[0]}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{c.first_name} {c.last_name}</h4>
                      <p className="text-sm text-gray-500">{c.job_title || 'No Title'}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-gray-600">
                    <p>📧 {c.email}</p>
                    <p>📍 {c.location || 'No Location'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Edit Candidate Form */}
        {activeTab === 'candidates' && editing && (
          <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
            <div className="flex items-center gap-4">
              <button onClick={() => setEditing(null)} className="text-gray-500 hover:text-gray-900 text-2xl">←</button>
              <h2 className="text-3xl font-bold text-gray-900">{editing.id ? 'Edit Candidate' : 'New Candidate'}</h2>
            </div>
            
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 space-y-8">
              {/* Basic Info */}
              <section>
                <h3 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <input placeholder="First Name" value={editing.first_name} onChange={e => setEditing({...editing, first_name: e.target.value})} className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" />
                  <input placeholder="Last Name" value={editing.last_name} onChange={e => setEditing({...editing, last_name: e.target.value})} className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" />
                  <input placeholder="Email" type="email" value={editing.email} onChange={e => setEditing({...editing, email: e.target.value})} className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" />
                  <input placeholder="Phone" value={editing.phone || ''} onChange={e => setEditing({...editing, phone: e.target.value})} className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" />
                  <input placeholder="Location" value={editing.location || ''} onChange={e => setEditing({...editing, location: e.target.value})} className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 col-span-2" />
                </div>
              </section>

              {/* Professional */}
              <section>
                <h3 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">Professional Links</h3>
                <div className="grid grid-cols-2 gap-4">
                  <input placeholder="LinkedIn URL" value={editing.linkedin_url || ''} onChange={e => setEditing({...editing, linkedin_url: e.target.value})} className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" />
                  <input placeholder="GitHub URL" value={editing.github_url || ''} onChange={e => setEditing({...editing, github_url: e.target.value})} className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" />
                  <input placeholder="Portfolio URL" value={editing.portfolio_url || ''} onChange={e => setEditing({...editing, portfolio_url: e.target.value})} className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 col-span-2" />
                  <input placeholder="Job Title" value={editing.job_title || ''} onChange={e => setEditing({...editing, job_title: e.target.value})} className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" />
                  <input placeholder="Years of Exp" type="number" value={editing.years_exp || ''} onChange={e => setEditing({...editing, years_exp: Number(e.target.value)})} className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" />
                </div>
              </section>

              {/* Demographics */}
              <section>
                <h3 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">Demographics (EEO)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <input placeholder="Gender (e.g., Male, Female, Non-binary)" value={editing.gender || ''} onChange={e => setEditing({...editing, gender: e.target.value})} className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" />
                  <input placeholder="Pronouns (e.g., He/Him)" value={editing.pronouns || ''} onChange={e => setEditing({...editing, pronouns: e.target.value})} className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" />
                  <input placeholder="Race (e.g., Asian, White, Black)" value={editing.race || ''} onChange={e => setEditing({...editing, race: e.target.value})} className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" />
                  <input placeholder="Ethnicity (e.g., Hispanic or Latino)" value={editing.ethnicity || ''} onChange={e => setEditing({...editing, ethnicity: e.target.value})} className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" />
                  <input placeholder="Veteran Status" value={editing.veteran_status || ''} onChange={e => setEditing({...editing, veteran_status: e.target.value})} className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" />
                  <input placeholder="Disability Status" value={editing.disability_status || ''} onChange={e => setEditing({...editing, disability_status: e.target.value})} className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" />
                </div>
              </section>

              <div className="pt-4 flex justify-end gap-3">
                <button onClick={() => setEditing(null)} className="px-6 py-2.5 rounded-lg text-gray-600 font-medium hover:bg-gray-100 transition">Cancel</button>
                <button onClick={handleSaveCandidate} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-2.5 rounded-lg font-bold shadow-md transition disabled:opacity-50">
                  {loading ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Credentials Vault (Basic View) */}
        {activeTab === 'credentials' && (
           <div className="max-w-5xl mx-auto space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Credentials Vault</h2>
              <p className="text-gray-500 mt-1">Manage platform logins for candidates.</p>
            </div>
            
            {/* New Credential Form */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6">
              <h3 className="text-xl font-bold text-gray-800 border-b pb-2">➕ Add New Login</h3>
              <p className="text-sm text-gray-500 mb-4">Passwords will be AES-GCM encrypted using your Master Key before saving.</p>
              
              <form className="grid grid-cols-2 gap-4" onSubmit={async (e) => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget)
                const candidateId = fd.get('candidate_id') as string
                const platform = fd.get('platform') as string
                const platformUrl = fd.get('platform_url') as string
                const email = fd.get('email') as string
                const rawPassword = fd.get('password') as string
                const notes = fd.get('notes') as string

                if (!candidateId || !platform || !email || !rawPassword || !masterKey) {
                  alert("Please fill all required fields and ensure you have a Master Key set in Settings.")
                  return
                }

                try {
                  const { encryptPassword } = await import('../lib/crypto')
                  const { saveCredential } = await import('../lib/supabase')
                  const encrypted = await encryptPassword(rawPassword, masterKey)
                  
                  await saveCredential({
                    candidate_id: candidateId,
                    platform,
                    platform_url: platformUrl,
                    email,
                    password: encrypted,
                    notes
                  })
                  alert("Credential encrypted and saved successfully! 🔐")
                  ;(e.target as HTMLFormElement).reset()
                } catch (err) {
                  console.error(err)
                  alert("Error saving credential. Check console.")
                }
              }}>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Candidate *</label>
                  <select name="candidate_id" required className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">-- Select Candidate --</option>
                    {candidates.map(c => (
                      <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Platform (e.g. Workday) *</label>
                  <input name="platform" required className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Login Email *</label>
                  <input name="email" type="email" required className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                  <input name="password" type="password" required className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Platform URL (Optional)</label>
                  <input name="platform_url" type="url" placeholder="https://jobs.workday.com" className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-2 pt-4">
                  <button type="submit" className="w-full bg-gray-900 hover:bg-black text-white px-8 py-3 rounded-xl font-bold shadow-md transition">
                    Encrypt & Save to Vault 🔐
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

const root = createRoot(document.getElementById('root')!)
root.render(<Options />)
