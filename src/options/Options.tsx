import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { getCandidates, getApplications, saveCandidate } from '../lib/supabase'
import type { Candidate } from '../lib/types'
import { 
  Users, Briefcase, KeyRound, Settings, Plus, Search, Download, 
  X, Save, Lock, Bot, Database, Sparkles, LayoutDashboard,
  CheckCircle2, ExternalLink, ShieldCheck, Mail, MapPin, Loader2, Key
} from 'lucide-react'

type Tab = 'candidates' | 'applications' | 'credentials' | 'settings'
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
  const [applications, setApplications] = useState<any[]>([])
  const [appSearch, setAppSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState<Partial<Candidate> | null>(null)

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
      setLoading(true)
      const [candData, appData] = await Promise.all([getCandidates(), getApplications()])
      setCandidates(candData)
      setApplications(appData)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
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
      setTimeout(() => setSettingsSaved(false), 3000)
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

  const NavItem = ({ id, label, icon: Icon }: { id: Tab, label: string, icon: any }) => (
    <button 
      onClick={() => { setActiveTab(id); setEditing(null); }} 
      className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 group relative outline-none
        ${activeTab === id && !editing
          ? 'bg-white/10 text-white font-bold shadow-lg shadow-black/10 backdrop-blur-md border border-white/10' 
          : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}
    >
      <Icon size={20} className={`transition-transform duration-300 ${activeTab === id && !editing ? 'scale-110 text-indigo-400' : 'group-hover:text-indigo-400'}`} />
      <span className="tracking-wide text-sm">{label}</span>
      {activeTab === id && !editing && (
        <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
      )}
    </button>
  )

  const inputClass = "w-full bg-white border border-slate-200 rounded-xl px-5 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 shadow-sm placeholder:text-slate-400 font-medium text-slate-800"
  const selectClass = "w-full bg-white border border-slate-200 rounded-xl px-5 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 shadow-sm text-slate-800 appearance-none font-medium"
  const labelClass = "block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider"
  const cardClass = "bg-white/80 backdrop-blur-xl border border-white/60 shadow-xl shadow-slate-200/50 rounded-3xl p-8"
  const sectionTitleClass = "text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"

  return (
    <div className="flex h-screen bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-900 overflow-hidden">
      {/* Sidebar - Premium Dark/Gradient */}
      <div className="w-[300px] bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 shadow-2xl flex flex-col relative z-20 overflow-y-auto">
        {/* Glow effect behind logo */}
        <div className="absolute top-0 left-0 w-full h-64 bg-indigo-500/10 blur-3xl pointer-events-none" />
        
        <div className="p-8 flex items-center gap-4 mb-4 relative z-10">
          <div className="w-12 h-12 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/40">
            <Bot size={24} className="animate-bounce-slow" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">AutoFill<span className="text-indigo-400">.</span></h1>
            <p className="text-xs font-medium text-slate-400 tracking-wider uppercase mt-0.5">Control Center</p>
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 relative z-10">
          <NavItem id="candidates" label="Candidates" icon={Users} />
          <NavItem id="applications" label="Applications" icon={Briefcase} />
          <NavItem id="credentials" label="Credentials Vault" icon={KeyRound} />
          <div className="h-4" /> {/* Spacer */}
          <NavItem id="settings" label="Settings" icon={Settings} />
        </nav>
        
        <div className="p-6 text-xs text-slate-500 font-medium text-center relative z-10 border-t border-white/5 mt-auto">
          Job Autofill Extension v1.0.0
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto relative scroll-smooth bg-slate-50/50">
        {/* Subtle background blob/gradient */}
        <div className="absolute top-0 right-0 w-[800px] h-[600px] bg-gradient-to-bl from-indigo-200/40 via-purple-100/20 to-transparent blur-3xl rounded-full pointer-events-none -z-10 transform translate-x-1/3 -translate-y-1/3" />
        
        <div className="p-12 max-w-[1400px] mx-auto min-h-full">
          
          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="max-w-3xl mx-auto space-y-10 animate-fade-in-up">
              <div className="mb-12">
                <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Settings</h2>
                <p className="text-slate-500 mt-2 font-medium text-lg">Configure your backend, AI integrations, and encryption.</p>
              </div>
              
              <div className={`${cardClass} hover:shadow-2xl transition-shadow duration-500 group relative overflow-hidden`}>
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Database size={100} />
                </div>
                <h3 className={sectionTitleClass}>
                  <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl"><Database size={20} /></div>
                  Supabase Configuration
                </h3>
                <div className="space-y-6 relative z-10">
                  <div>
                    <label className={labelClass}>Project URL</label>
                    <input type="text" value={supaUrl} onChange={e => setSupaUrl(e.target.value)} className={inputClass} placeholder="https://xyz.supabase.co" />
                  </div>
                  <div>
                    <label className={labelClass}>Anon Public Key</label>
                    <input type="password" value={supaKey} onChange={e => setSupaKey(e.target.value)} className={inputClass} placeholder="eyJh..." />
                  </div>
                </div>
              </div>

              <div className={`${cardClass} hover:shadow-2xl transition-shadow duration-500 group relative overflow-hidden`}>
                 <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Sparkles size={100} />
                </div>
                <h3 className={sectionTitleClass}>
                  <div className="p-2 bg-purple-100 text-purple-600 rounded-xl"><Sparkles size={20} /></div>
                  AI Integrations
                </h3>
                <div className="space-y-6 relative z-10">
                  <div>
                    <label className={labelClass}>Provider</label>
                    <div className="relative">
                      <select value={aiProvider} onChange={e => setAiProvider(e.target.value as AIProvider)} className={selectClass}>
                        <option value="claude">Anthropic (Claude 3)</option>
                        <option value="openai">OpenAI (GPT-4o)</option>
                        <option value="gemini">Google Gemini (1.5 Pro)</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>API Key</label>
                    <input type="password" value={aiKey} onChange={e => setAiKey(e.target.value)} className={inputClass} placeholder="sk-..." />
                  </div>
                </div>
              </div>

              <div className={`${cardClass} hover:shadow-2xl transition-shadow duration-500 group relative overflow-hidden ring-1 ring-emerald-500/20`}>
                <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity text-emerald-500">
                  <ShieldCheck size={100} />
                </div>
                <h3 className={sectionTitleClass}>
                  <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl"><ShieldCheck size={20} /></div>
                  Credentials Vault
                </h3>
                <div className="relative z-10">
                  <label className={labelClass}>Master Encryption Key</label>
                  <p className="text-sm text-slate-500 mb-3 font-medium">Used to locally encrypt/decrypt platform passwords. Never synced to the cloud.</p>
                  <input type="password" value={masterKey} onChange={e => setMasterKey(e.target.value)} className={inputClass} placeholder="SuperSecretKey123!" />
                </div>
              </div>

              <div className="flex items-center gap-6 pt-4 pb-12 sticky bottom-0 bg-slate-50/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200/50 shadow-lg">
                <button onClick={saveSettings} className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-10 py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2">
                  <Save size={20} /> Save Configuration
                </button>
                {settingsSaved && (
                  <span className="text-emerald-600 font-bold flex items-center gap-2 animate-fade-in">
                    <CheckCircle2 size={24} /> Settings Saved Successfully!
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Applications Tab */}
          {activeTab === 'applications' && (
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Application Tracker</h2>
                  <p className="text-slate-500 mt-2 font-medium text-lg">Track and manage jobs filled by the extension.</p>
                </div>
                <div className="flex gap-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                      type="text" 
                      placeholder="Search company, candidate..." 
                      value={appSearch}
                      onChange={(e) => setAppSearch(e.target.value)}
                      className="w-80 bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm font-medium"
                    />
                  </div>
                  <button 
                    onClick={() => {
                      const search = appSearch.toLowerCase();
                      const filteredApps = applications.filter(app => 
                        app.company.toLowerCase().includes(search) || 
                        app.status.toLowerCase().includes(search) ||
                        `${app.candidate?.first_name} ${app.candidate?.last_name}`.toLowerCase().includes(search)
                      );
                      const csvRows = [
                        ['#', 'Company', 'Candidate', 'Status', 'Date Applied', 'URL'],
                        ...filteredApps.map((app, i) => [
                          `"${i + 1}"`,
                          `"${app.company.replace(/"/g, '""')}"`,
                          `"${app.candidate?.first_name} ${app.candidate?.last_name}"`,
                          `"${app.status}"`,
                          `"${new Date(app.applied_at).toLocaleDateString()}"`,
                          `"${app.url || ''}"`
                        ])
                      ];
                      const csvContent = csvRows.map(e => e.join(",")).join("\n");
                      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.setAttribute("href", url);
                      link.setAttribute("download", "applications_export.csv");
                      document.body.appendChild(link);
                      link.click();
                      link.remove();
                      URL.revokeObjectURL(url);
                    }}
                    className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 px-6 py-3 rounded-xl font-bold shadow-sm transition-colors flex items-center gap-2"
                  >
                    <Download size={18} /> Export CSV
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
                <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
                  <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50/90 backdrop-blur-md sticky top-0 z-10">
                    <tr>
                      <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-16">#</th>
                      <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Company</th>
                      <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Candidate</th>
                      <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Date Applied</th>
                      <th className="px-8 py-5 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Link</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {applications.filter(app => {
                      const search = appSearch.toLowerCase();
                      return app.company.toLowerCase().includes(search) || 
                             app.status.toLowerCase().includes(search) ||
                             `${app.candidate?.first_name} ${app.candidate?.last_name}`.toLowerCase().includes(search);
                    }).map((app, i) => (
                      <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-5 whitespace-nowrap">
                          <div className="font-bold text-slate-400 text-sm">{i + 1}</div>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap">
                          <div className="font-bold text-slate-900 text-sm">{app.company}</div>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                              {app.candidate?.first_name?.[0]}{app.candidate?.last_name?.[0]}
                            </div>
                            <span className="text-sm font-semibold text-slate-700">{app.candidate?.first_name} {app.candidate?.last_name}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap">
                          <span className="px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                            {app.status}
                          </span>
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap text-sm font-medium text-slate-500">
                          {new Date(app.applied_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-8 py-5 whitespace-nowrap text-sm text-indigo-600 font-bold">
                          {app.url ? (
                             <a href={app.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-indigo-800 transition">
                               View <ExternalLink size={14} />
                             </a>
                          ) : <span className="text-slate-400 font-medium">N/A</span>}
                        </td>
                      </tr>
                    ))}
                    {applications.length === 0 && (
                       <tr>
                          <td colSpan={6} className="px-8 py-20 text-center text-slate-500 font-medium">
                             <Briefcase size={48} className="mx-auto mb-4 text-slate-300" />
                             No applications tracked yet.
                          </td>
                       </tr>
                    )}
                  </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Candidates Tab */}
          {activeTab === 'candidates' && !editing && (
            <div className="max-w-7xl mx-auto space-y-8 animate-fade-in-up">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Candidates</h2>
                  <p className="text-slate-500 mt-2 font-medium text-lg">Manage profiles, data, and demographic information.</p>
                </div>
                <button onClick={() => setEditing({ first_name: '', last_name: '', email: '', work_auth: true, requires_sponsorship: false, non_compete: false })} 
                  className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition-all duration-300 transform hover:-translate-y-0.5 flex items-center gap-2">
                  <Plus size={20} strokeWidth={3} /> New Candidate
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {candidates.map(c => (
                  <div key={c.id} 
                    className="bg-white p-6 rounded-3xl shadow-lg shadow-slate-200/40 border border-slate-100 hover:shadow-2xl hover:border-indigo-100 hover:-translate-y-1 transition-all duration-300 cursor-pointer group relative overflow-hidden" 
                    onClick={() => setEditing(c)}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-[100px] -z-0 opacity-50 group-hover:bg-indigo-100 transition-colors" />
                    
                    <div className="flex items-center gap-5 mb-6 relative z-10">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 text-indigo-700 flex items-center justify-center font-black text-2xl shadow-inner group-hover:from-indigo-600 group-hover:to-violet-600 group-hover:text-white transition-all duration-300">
                        {c.first_name[0]}{c.last_name[0]}
                      </div>
                      <div>
                        <h4 className="font-bold text-xl text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors">{c.first_name} {c.last_name}</h4>
                        <p className="text-sm font-semibold text-slate-500 mt-1">{c.job_title || 'No Title'}</p>
                      </div>
                    </div>
                    <div className="space-y-3 text-sm font-medium text-slate-600 relative z-10 border-t border-slate-100 pt-4">
                      <div className="flex items-center gap-3">
                         <div className="p-1.5 bg-slate-100 rounded-lg text-slate-500"><Mail size={16} /></div>
                         <span className="truncate">{c.email}</span>
                      </div>
                      <div className="flex items-center gap-3">
                         <div className="p-1.5 bg-slate-100 rounded-lg text-slate-500"><MapPin size={16} /></div>
                         <span className="truncate">{c.location || 'Location missing'}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {candidates.length === 0 && (
                   <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 rounded-3xl">
                      <Users size={48} className="mx-auto mb-4 text-slate-300" />
                      <p className="text-lg font-bold text-slate-500">No candidates found.</p>
                      <p className="text-slate-400 font-medium">Create your first candidate profile to get started.</p>
                   </div>
                )}
              </div>
            </div>
          )}

          {/* Edit Candidate Form */}
          {activeTab === 'candidates' && editing && (
            <div className="max-w-5xl mx-auto space-y-8 animate-fade-in-up pb-20">
              <div className="flex justify-between items-center bg-white/80 backdrop-blur-xl p-4 rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 sticky top-0 z-50">
                <div className="flex items-center gap-4">
                  <button onClick={() => setEditing(null)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                    <X size={20} strokeWidth={3} />
                  </button>
                  <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{editing.id ? `Edit ${editing.first_name}` : 'New Candidate Profile'}</h2>
                </div>
                <button onClick={handleSaveCandidate} disabled={loading} className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-500/30 transition-all duration-300 flex items-center gap-2 disabled:opacity-50">
                  {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  {loading ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
              
              <div className="grid grid-cols-1 gap-8">
                {/* Basic Info */}
                <section className={cardClass}>
                  <h3 className={sectionTitleClass}>
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-xl"><User size={20} /></div>
                    Basic Information & Location
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label className={labelClass}>First Name</label><input value={editing.first_name} onChange={e => setEditing({...editing, first_name: e.target.value})} className={inputClass} /></div>
                    <div><label className={labelClass}>Last Name</label><input value={editing.last_name} onChange={e => setEditing({...editing, last_name: e.target.value})} className={inputClass} /></div>
                    <div><label className={labelClass}>Email Address</label><input type="email" value={editing.email} onChange={e => setEditing({...editing, email: e.target.value})} className={inputClass} /></div>
                    <div><label className={labelClass}>Phone Number</label><input value={editing.phone || ''} onChange={e => setEditing({...editing, phone: e.target.value})} className={inputClass} /></div>
                    <div className="md:col-span-2"><label className={labelClass}>Full Location Address</label><input placeholder="e.g., San Francisco, CA" value={editing.location || ''} onChange={e => setEditing({...editing, location: e.target.value})} className={inputClass} /></div>
                    <div><label className={labelClass}>City</label><input value={editing.city || ''} onChange={e => setEditing({...editing, city: e.target.value})} className={inputClass} /></div>
                    <div><label className={labelClass}>State/Province</label><input value={editing.state || ''} onChange={e => setEditing({...editing, state: e.target.value})} className={inputClass} /></div>
                    <div><label className={labelClass}>Postal Code</label><input value={editing.postal_code || ''} onChange={e => setEditing({...editing, postal_code: e.target.value})} className={inputClass} /></div>
                  </div>
                </section>

                {/* Professional */}
                <section className={cardClass}>
                  <h3 className={sectionTitleClass}>
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl"><Briefcase size={20} /></div>
                    Professional Profile
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label className={labelClass}>Current Job Title</label><input value={editing.job_title || ''} onChange={e => setEditing({...editing, job_title: e.target.value})} className={inputClass} /></div>
                    <div><label className={labelClass}>Years of Experience</label><input type="number" value={editing.years_exp || ''} onChange={e => setEditing({...editing, years_exp: Number(e.target.value)})} className={inputClass} /></div>
                    <div><label className={labelClass}>LinkedIn URL</label><input value={editing.linkedin_url || ''} onChange={e => setEditing({...editing, linkedin_url: e.target.value})} className={inputClass} /></div>
                    <div><label className={labelClass}>GitHub URL</label><input value={editing.github_url || ''} onChange={e => setEditing({...editing, github_url: e.target.value})} className={inputClass} /></div>
                    <div className="md:col-span-2"><label className={labelClass}>Portfolio URL</label><input value={editing.portfolio_url || ''} onChange={e => setEditing({...editing, portfolio_url: e.target.value})} className={inputClass} /></div>
                    <div className="md:col-span-2"><label className={labelClass}>Salary Expectation</label><input placeholder="e.g. $120,000 - $140,000" value={editing.salary_expectation || ''} onChange={e => setEditing({...editing, salary_expectation: e.target.value})} className={inputClass} /></div>
                  </div>
                </section>

                {/* Account Credentials */}
                <section className={`${cardClass} border-l-4 border-l-purple-500`}>
                  <h3 className={sectionTitleClass}>
                     <div className="p-2 bg-purple-100 text-purple-600 rounded-xl"><Lock size={20} /></div>
                     Account Credentials defaults
                  </h3>
                  <p className="text-sm font-medium text-slate-500 mb-6">These credentials will be injected into "Create Account" forms automatically.</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label className={labelClass}>Default Username</label><input placeholder="Leave blank to use email" value={editing.username || ''} onChange={e => setEditing({...editing, username: e.target.value})} className={inputClass} /></div>
                    <div><label className={labelClass}>Default Password</label><input type="password" value={editing.default_password || ''} onChange={e => setEditing({...editing, default_password: e.target.value})} className={inputClass} /></div>
                  </div>
                </section>

                {/* Work Experience Arrays */}
                <section className={cardClass}>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <div className="p-2 bg-orange-100 text-orange-600 rounded-xl"><Briefcase size={20} /></div>
                      Work Experience
                    </h3>
                    <button onClick={() => setEditing({...editing, work_experiences: [...(editing.work_experiences || []), {company:'', job_title:''}]})} className="text-sm bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl hover:bg-indigo-100 font-bold flex items-center gap-1 transition-colors"><Plus size={16}/> Add Job</button>
                  </div>
                  <div className="space-y-6">
                    {(editing.work_experiences || []).map((exp, idx) => (
                      <div key={idx} className="p-6 border border-slate-200 rounded-2xl bg-slate-50 relative group">
                        <button onClick={() => setEditing({...editing, work_experiences: editing.work_experiences!.filter((_, i) => i !== idx)})} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 transition-colors shadow-sm"><X size={16}/></button>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-2">
                          <div><label className={labelClass}>Company *</label><input value={exp.company || ''} onChange={e => { const newArr = [...editing.work_experiences!]; newArr[idx].company = e.target.value; setEditing({...editing, work_experiences: newArr})}} className={inputClass} /></div>
                          <div><label className={labelClass}>Job Title *</label><input value={exp.job_title || ''} onChange={e => { const newArr = [...editing.work_experiences!]; newArr[idx].job_title = e.target.value; setEditing({...editing, work_experiences: newArr})}} className={inputClass} /></div>
                          <div className="md:col-span-2"><label className={labelClass}>Location</label><input value={exp.location || ''} onChange={e => { const newArr = [...editing.work_experiences!]; newArr[idx].location = e.target.value; setEditing({...editing, work_experiences: newArr})}} className={inputClass} /></div>
                          <div><label className={labelClass}>Start Date</label><input type="month" value={exp.start_date || ''} onChange={e => { const newArr = [...editing.work_experiences!]; newArr[idx].start_date = e.target.value; setEditing({...editing, work_experiences: newArr})}} className={inputClass} /></div>
                          {!exp.is_current && <div><label className={labelClass}>End Date</label><input type="month" value={exp.end_date || ''} onChange={e => { const newArr = [...editing.work_experiences!]; newArr[idx].end_date = e.target.value; setEditing({...editing, work_experiences: newArr})}} className={inputClass} /></div>}
                          <div className="md:col-span-2 pt-2">
                             <label className="flex items-center gap-3 cursor-pointer group/check">
                                <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${exp.is_current ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300 bg-white group-hover/check:border-indigo-400'}`}>
                                   {exp.is_current && <CheckCircle2 size={16} strokeWidth={3} />}
                                </div>
                                <input type="checkbox" className="hidden" checked={exp.is_current || false} onChange={e => { const newArr = [...editing.work_experiences!]; newArr[idx].is_current = e.target.checked; setEditing({...editing, work_experiences: newArr})}} /> 
                                <span className="font-bold text-slate-700">I currently work here</span>
                             </label>
                          </div>
                          <div className="md:col-span-2"><label className={labelClass}>Description / Achievements</label><textarea rows={4} value={exp.description || ''} onChange={e => { const newArr = [...editing.work_experiences!]; newArr[idx].description = e.target.value; setEditing({...editing, work_experiences: newArr})}} className={`${inputClass} resize-y`} /></div>
                        </div>
                      </div>
                    ))}
                    {(!editing.work_experiences || editing.work_experiences.length === 0) && <div className="text-center py-10 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-slate-400 font-medium">No work experience added.</div>}
                  </div>
                </section>

                {/* Documents */}
                <section className={cardClass}>
                  <h3 className={sectionTitleClass}>
                    <div className="p-2 bg-rose-100 text-rose-600 rounded-xl"><FileText size={20} /></div>
                    Documents (PDFs)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 relative overflow-hidden">
                      <label className={labelClass}>Resume Document</label>
                      <div className="mt-4 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-6 bg-white hover:bg-slate-50 transition-colors relative">
                        <Upload size={32} className="text-slate-400 mb-2" />
                        <span className="text-sm font-bold text-slate-600">Click to upload</span>
                        <input type="file" accept=".pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={async (e) => {
                          const file = e.target.files?.[0]; if (!file) return;
                          try {
                            const { uploadDocument } = await import('../lib/supabase')
                            const cid = editing.id || crypto.randomUUID(); if (!editing.id) setEditing({...editing, id: cid})
                            const url = await uploadDocument(cid, file, 'resume')
                            setEditing(prev => ({...prev!, resume_url: url})); alert('Resume uploaded! ✅')
                          } catch (err) { alert('Upload failed.'); console.error(err) }
                        }} />
                      </div>
                      {editing.resume_url && <a href={editing.resume_url} target="_blank" className="mt-4 flex items-center justify-center gap-2 text-sm font-bold text-indigo-600 bg-indigo-50 py-2 rounded-lg" rel="noreferrer"><ExternalLink size={16}/> View Uploaded Resume</a>}
                    </div>
                    <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 relative overflow-hidden">
                      <label className={labelClass}>Cover Letter</label>
                      <div className="mt-4 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-6 bg-white hover:bg-slate-50 transition-colors relative">
                        <Upload size={32} className="text-slate-400 mb-2" />
                        <span className="text-sm font-bold text-slate-600">Click to upload</span>
                        <input type="file" accept=".pdf" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={async (e) => {
                          const file = e.target.files?.[0]; if (!file) return;
                          try {
                            const { uploadDocument } = await import('../lib/supabase')
                            const cid = editing.id || crypto.randomUUID(); if (!editing.id) setEditing({...editing, id: cid})
                            const url = await uploadDocument(cid, file, 'cover_letter')
                            setEditing(prev => ({...prev!, cover_letter_url: url})); alert('Cover Letter uploaded! ✅')
                          } catch (err) { alert('Upload failed.'); console.error(err) }
                        }} />
                      </div>
                      {editing.cover_letter_url && <a href={editing.cover_letter_url} target="_blank" className="mt-4 flex items-center justify-center gap-2 text-sm font-bold text-indigo-600 bg-indigo-50 py-2 rounded-lg" rel="noreferrer"><ExternalLink size={16}/> View Uploaded Cover Letter</a>}
                    </div>
                  </div>
                </section>
                
              </div>
            </div>
          )}

          {/* Credentials Vault Tab */}
          {activeTab === 'credentials' && (
             <div className="max-w-4xl mx-auto space-y-8 animate-fade-in-up">
              <div className="mb-12">
                <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight">Credentials Vault</h2>
                <p className="text-slate-500 mt-2 font-medium text-lg">Securely manage platform logins for autofilling.</p>
              </div>
              
              <div className={`${cardClass} border-t-8 border-t-emerald-500`}>
                <h3 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-3">
                   <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl"><Key size={24} /></div>
                   Add New Platform Login
                </h3>
                <p className="text-slate-500 font-medium mb-8 pb-6 border-b border-slate-100">Passwords will be locally encrypted using AES-GCM and your Master Key before saving to the cloud.</p>
                
                <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={async (e) => {
                  e.preventDefault()
                  const fd = new FormData(e.currentTarget)
                  const candidateId = fd.get('candidate_id') as string
                  const platform = fd.get('platform') as string
                  const platformUrl = fd.get('platform_url') as string
                  const email = fd.get('email') as string
                  const rawPassword = fd.get('password') as string

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
                    })
                    alert("Credential encrypted and saved successfully! 🔐")
                    ;(e.target as HTMLFormElement).reset()
                  } catch (err) {
                    console.error(err)
                    alert("Error saving credential. Check console.")
                  }
                }}>
                  <div>
                    <label className={labelClass}>Select Candidate *</label>
                    <div className="relative">
                      <select name="candidate_id" required className={selectClass}>
                        <option value="">-- Select Candidate --</option>
                        {candidates.map(c => (
                          <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">▼</div>
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>Platform Name (e.g. Workday) *</label>
                    <input name="platform" required className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Login Email *</label>
                    <input name="email" type="email" required className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Password *</label>
                    <input name="password" type="password" required className={inputClass} />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}>Platform Login URL (Optional)</label>
                    <input name="platform_url" type="url" placeholder="https://jobs.workday.com/login" className={inputClass} />
                  </div>
                  <div className="md:col-span-2 pt-6">
                    <button type="submit" className="w-full bg-slate-900 hover:bg-black text-white px-8 py-4 rounded-xl font-bold shadow-xl shadow-slate-900/20 transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center gap-2 text-lg">
                      <Lock size={20} /> Encrypt & Save to Vault
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

const root = createRoot(document.getElementById('root')!)
root.render(<Options />)
