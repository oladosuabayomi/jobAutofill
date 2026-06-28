import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { getCandidates, getApplications, saveCandidate } from '../lib/supabase'
import type { Candidate } from '../lib/types'

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
          <button onClick={() => setActiveTab('applications')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'applications' ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-600 hover:bg-gray-100'}`}>📊 Applications</button>
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

        {/* Applications Tab */}
        {activeTab === 'applications' && (
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-3xl font-bold text-gray-900">Application Tracker</h2>
              <div className="flex gap-4">
                <input 
                  type="text" 
                  placeholder="Filter by company, candidate, or status..." 
                  value={appSearch}
                  onChange={(e) => setAppSearch(e.target.value)}
                  className="border rounded-lg px-4 py-2 w-72 focus:ring-2 focus:ring-blue-500"
                />
                <button 
                  onClick={() => {
                    const search = appSearch.toLowerCase();
                    const filteredApps = applications.filter(app => 
                      app.company.toLowerCase().includes(search) || 
                      app.status.toLowerCase().includes(search) ||
                      `${app.candidate?.first_name} ${app.candidate?.last_name}`.toLowerCase().includes(search)
                    );
                    const csvRows = [
                      ['Company', 'Candidate', 'Status', 'Date Applied', 'URL'],
                      ...filteredApps.map(app => [
                        `"${app.company.replace(/"/g, '""')}"`,
                        `"${app.candidate?.first_name} ${app.candidate?.last_name}"`,
                        `"${app.status}"`,
                        `"${new Date(app.applied_at).toLocaleDateString()}"`,
                        `"${app.url || ''}"`
                      ])
                    ];
                    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
                    const encodedUri = encodeURI(csvContent);
                    const link = document.createElement("a");
                    link.setAttribute("href", encodedUri);
                    link.setAttribute("download", "applications_export.csv");
                    document.body.appendChild(link);
                    link.click();
                    link.remove();
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2"
                >
                  📥 Export CSV
                </button>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Applied</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {applications.filter(app => {
                    const search = appSearch.toLowerCase();
                    return app.company.toLowerCase().includes(search) || 
                           app.status.toLowerCase().includes(search) ||
                           `${app.candidate?.first_name} ${app.candidate?.last_name}`.toLowerCase().includes(search);
                  }).map(app => (
                    <tr key={app.id}>
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{app.company}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">{app.candidate?.first_name} {app.candidate?.last_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          {app.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(app.applied_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                        <a href={app.url} target="_blank" rel="noreferrer">Link</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                <h3 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">Basic Information & Location</h3>
                <div className="grid grid-cols-2 gap-4">
                  <input placeholder="First Name" value={editing.first_name} onChange={e => setEditing({...editing, first_name: e.target.value})} className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" />
                  <input placeholder="Last Name" value={editing.last_name} onChange={e => setEditing({...editing, last_name: e.target.value})} className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" />
                  <input placeholder="Email" type="email" value={editing.email} onChange={e => setEditing({...editing, email: e.target.value})} className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" />
                  <input placeholder="Phone" value={editing.phone || ''} onChange={e => setEditing({...editing, phone: e.target.value})} className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" />
                  <input placeholder="Full Location (e.g., San Francisco, CA)" value={editing.location || ''} onChange={e => setEditing({...editing, location: e.target.value})} className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 col-span-2" />
                  <input placeholder="City" value={editing.city || ''} onChange={e => setEditing({...editing, city: e.target.value})} className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" />
                  <input placeholder="State" value={editing.state || ''} onChange={e => setEditing({...editing, state: e.target.value})} className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" />
                  <input placeholder="Postal Code" value={editing.postal_code || ''} onChange={e => setEditing({...editing, postal_code: e.target.value})} className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" />
                </div>
              </section>

              {/* Professional */}
              <section>
                <h3 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">Professional & Expectations</h3>
                <div className="grid grid-cols-2 gap-4">
                  <input placeholder="LinkedIn URL" value={editing.linkedin_url || ''} onChange={e => setEditing({...editing, linkedin_url: e.target.value})} className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" />
                  <input placeholder="GitHub URL" value={editing.github_url || ''} onChange={e => setEditing({...editing, github_url: e.target.value})} className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" />
                  <input placeholder="Portfolio URL" value={editing.portfolio_url || ''} onChange={e => setEditing({...editing, portfolio_url: e.target.value})} className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 col-span-2" />
                  <input placeholder="Job Title" value={editing.job_title || ''} onChange={e => setEditing({...editing, job_title: e.target.value})} className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" />
                  <input placeholder="Years of Exp" type="number" value={editing.years_exp || ''} onChange={e => setEditing({...editing, years_exp: Number(e.target.value)})} className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" />
                  <input placeholder="Salary Expectation (e.g. $120,000)" value={editing.salary_expectation || ''} onChange={e => setEditing({...editing, salary_expectation: e.target.value})} className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 col-span-2" />
                </div>
              </section>

              {/* Account Credentials */}
              <section>
                <h3 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">Account Credentials</h3>
                <p className="text-sm text-gray-500 mb-4">These will be used automatically on "Create Account" or "Register" pages.</p>
                <div className="grid grid-cols-2 gap-4">
                  <input placeholder="Default Username (Leave blank to ignore)" value={editing.username || ''} onChange={e => setEditing({...editing, username: e.target.value})} className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" />
                  <input placeholder="Default Password" type="password" value={editing.default_password || ''} onChange={e => setEditing({...editing, default_password: e.target.value})} className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" />
                </div>
              </section>

              {/* Work Experience Arrays */}
              <section>
                <div className="flex justify-between items-center border-b pb-2 mb-4">
                  <h3 className="text-xl font-bold text-gray-800">Work Experience</h3>
                  <button onClick={() => setEditing({...editing, work_experiences: [...(editing.work_experiences || []), {company:'', job_title:''}]})} className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-md hover:bg-blue-200 font-bold">+ Add Job</button>
                </div>
                <div className="space-y-4">
                  {(editing.work_experiences || []).map((exp, idx) => (
                    <div key={idx} className="p-4 border rounded-xl bg-gray-50 relative">
                      <button onClick={() => setEditing({...editing, work_experiences: editing.work_experiences!.filter((_, i) => i !== idx)})} className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-xl leading-none">&times;</button>
                      <div className="grid grid-cols-2 gap-4">
                        <input placeholder="Company *" value={exp.company || ''} onChange={e => { const newArr = [...editing.work_experiences!]; newArr[idx].company = e.target.value; setEditing({...editing, work_experiences: newArr})}} className="border rounded-lg px-3 py-2 text-sm" />
                        <input placeholder="Job Title *" value={exp.job_title || ''} onChange={e => { const newArr = [...editing.work_experiences!]; newArr[idx].job_title = e.target.value; setEditing({...editing, work_experiences: newArr})}} className="border rounded-lg px-3 py-2 text-sm" />
                        <input placeholder="Location" value={exp.location || ''} onChange={e => { const newArr = [...editing.work_experiences!]; newArr[idx].location = e.target.value; setEditing({...editing, work_experiences: newArr})}} className="border rounded-lg px-3 py-2 text-sm" />
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={exp.is_current || false} onChange={e => { const newArr = [...editing.work_experiences!]; newArr[idx].is_current = e.target.checked; setEditing({...editing, work_experiences: newArr})}} /> Currently working here</label>
                        <input type="month" placeholder="Start Date" value={exp.start_date || ''} onChange={e => { const newArr = [...editing.work_experiences!]; newArr[idx].start_date = e.target.value; setEditing({...editing, work_experiences: newArr})}} className="border rounded-lg px-3 py-2 text-sm" />
                        {!exp.is_current && <input type="month" placeholder="End Date" value={exp.end_date || ''} onChange={e => { const newArr = [...editing.work_experiences!]; newArr[idx].end_date = e.target.value; setEditing({...editing, work_experiences: newArr})}} className="border rounded-lg px-3 py-2 text-sm" />}
                        <textarea placeholder="Description (Bullet points)" value={exp.description || ''} onChange={e => { const newArr = [...editing.work_experiences!]; newArr[idx].description = e.target.value; setEditing({...editing, work_experiences: newArr})}} className="border rounded-lg px-3 py-2 text-sm col-span-2 h-20" />
                      </div>
                    </div>
                  ))}
                  {(!editing.work_experiences || editing.work_experiences.length === 0) && <p className="text-gray-400 text-sm italic">No work experience added.</p>}
                </div>
              </section>

              {/* Education Arrays */}
              <section>
                <div className="flex justify-between items-center border-b pb-2 mb-4">
                  <h3 className="text-xl font-bold text-gray-800">Education History</h3>
                  <button onClick={() => setEditing({...editing, education: [...(editing.education || []), {institution:'', degree:''}]})} className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-md hover:bg-blue-200 font-bold">+ Add Degree</button>
                </div>
                <div className="space-y-4">
                  {(editing.education || []).map((edu, idx) => (
                    <div key={idx} className="p-4 border rounded-xl bg-gray-50 relative">
                      <button onClick={() => setEditing({...editing, education: editing.education!.filter((_, i) => i !== idx)})} className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-xl leading-none">&times;</button>
                      <div className="grid grid-cols-2 gap-4">
                        <input placeholder="Institution *" value={edu.institution || ''} onChange={e => { const newArr = [...editing.education!]; newArr[idx].institution = e.target.value; setEditing({...editing, education: newArr})}} className="border rounded-lg px-3 py-2 text-sm" />
                        <input placeholder="Degree (e.g. B.S.) *" value={edu.degree || ''} onChange={e => { const newArr = [...editing.education!]; newArr[idx].degree = e.target.value; setEditing({...editing, education: newArr})}} className="border rounded-lg px-3 py-2 text-sm" />
                        <input placeholder="Field of Study" value={edu.field_of_study || ''} onChange={e => { const newArr = [...editing.education!]; newArr[idx].field_of_study = e.target.value; setEditing({...editing, education: newArr})}} className="border rounded-lg px-3 py-2 text-sm col-span-2" />
                        <input type="month" placeholder="Start Date" value={edu.start_date || ''} onChange={e => { const newArr = [...editing.education!]; newArr[idx].start_date = e.target.value; setEditing({...editing, education: newArr})}} className="border rounded-lg px-3 py-2 text-sm" />
                        <input type="month" placeholder="End Date" value={edu.end_date || ''} onChange={e => { const newArr = [...editing.education!]; newArr[idx].end_date = e.target.value; setEditing({...editing, education: newArr})}} className="border rounded-lg px-3 py-2 text-sm" />
                      </div>
                    </div>
                  ))}
                  {(!editing.education || editing.education.length === 0) && <p className="text-gray-400 text-sm italic">No education added.</p>}
                </div>
              </section>

              {/* Skills Arrays */}
              <section>
                <div className="flex justify-between items-center border-b pb-2 mb-4">
                  <h3 className="text-xl font-bold text-gray-800">Skills & Competencies</h3>
                  <button onClick={() => setEditing({...editing, skills: [...(editing.skills || []), {name:''}]})} className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-md hover:bg-blue-200 font-bold">+ Add Skill</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(editing.skills || []).map((skill, idx) => (
                    <div key={idx} className="flex items-center bg-gray-100 rounded-full pl-3 pr-1 py-1 border shadow-sm">
                      <input placeholder="Skill" value={skill.name || ''} onChange={e => { const newArr = [...editing.skills!]; newArr[idx].name = e.target.value; setEditing({...editing, skills: newArr})}} className="bg-transparent border-none text-sm w-24 focus:ring-0 p-0" />
                      <input type="number" placeholder="Yrs" value={skill.years || ''} onChange={e => { const newArr = [...editing.skills!]; newArr[idx].years = Number(e.target.value); setEditing({...editing, skills: newArr})}} className="bg-white border rounded-full text-xs w-12 text-center p-1 mx-1" />
                      <button onClick={() => setEditing({...editing, skills: editing.skills!.filter((_, i) => i !== idx)})} className="text-gray-400 hover:text-red-500 rounded-full p-1">&times;</button>
                    </div>
                  ))}
                  {(!editing.skills || editing.skills.length === 0) && <p className="text-gray-400 text-sm italic w-full">No skills added.</p>}
                </div>
              </section>

              {/* Documents */}
              <section>
                <h3 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">Documents (PDFs)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Resume</label>
                    <input type="file" accept=".pdf" className="border rounded-lg px-4 py-2 w-full text-sm" onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      try {
                        const { uploadDocument } = await import('../lib/supabase')
                        // If new candidate, we might not have an ID yet, so generate a temp one or save candidate first.
                        // Wait, uploadDocument requires candidateId. Let's use a temporary UUID if it's new, 
                        // or better, just use the existing id if available, else generate one.
                        const cid = editing.id || crypto.randomUUID()
                        if (!editing.id) setEditing({...editing, id: cid})
                        
                        const url = await uploadDocument(cid, file, 'resume')
                        setEditing(prev => ({...prev!, resume_url: url}))
                        alert('Resume uploaded successfully! ✅')
                      } catch (err) {
                        alert('Failed to upload resume. Check console.')
                        console.error(err)
                      }
                    }} />
                    {editing.resume_url && <a href={editing.resume_url} target="_blank" className="text-xs text-blue-600 mt-1 block" rel="noreferrer">View Current Resume</a>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cover Letter</label>
                    <input type="file" accept=".pdf" className="border rounded-lg px-4 py-2 w-full text-sm" onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      try {
                        const { uploadDocument } = await import('../lib/supabase')
                        const cid = editing.id || crypto.randomUUID()
                        if (!editing.id) setEditing({...editing, id: cid})
                        
                        const url = await uploadDocument(cid, file, 'cover_letter')
                        setEditing(prev => ({...prev!, cover_letter_url: url}))
                        alert('Cover Letter uploaded successfully! ✅')
                      } catch (err) {
                        alert('Failed to upload cover letter. Check console.')
                        console.error(err)
                      }
                    }} />
                    {editing.cover_letter_url && <a href={editing.cover_letter_url} target="_blank" className="text-xs text-blue-600 mt-1 block" rel="noreferrer">View Current Cover Letter</a>}
                  </div>
                </div>
              </section>

              {/* Demographics */}
              <section>
                <h3 className="text-xl font-bold text-gray-800 border-b pb-2 mb-4">Demographics (EEO)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <select value={editing.gender || ''} onChange={e => setEditing({...editing, gender: e.target.value})} className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">-- Select Gender --</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Decline to self-identify">Decline to self-identify</option>
                  </select>
                  <select value={editing.pronouns || ''} onChange={e => setEditing({...editing, pronouns: e.target.value})} className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">-- Select Pronouns --</option>
                    <option value="He/Him">He/Him</option>
                    <option value="She/Her">She/Her</option>
                    <option value="They/Them">They/Them</option>
                    <option value="Decline to self-identify">Decline to self-identify</option>
                  </select>
                  <select value={editing.race || ''} onChange={e => setEditing({...editing, race: e.target.value})} className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">-- Select Race --</option>
                    <option value="Asian">Asian</option>
                    <option value="Black or African American">Black or African American</option>
                    <option value="Hispanic or Latino">Hispanic or Latino</option>
                    <option value="White">White</option>
                    <option value="Native American or Alaska Native">Native American or Alaska Native</option>
                    <option value="Native Hawaiian or Pacific Islander">Native Hawaiian or Pacific Islander</option>
                    <option value="Two or More Races">Two or More Races</option>
                    <option value="Decline to self-identify">Decline to self-identify</option>
                  </select>
                  <select value={editing.veteran_status || ''} onChange={e => setEditing({...editing, veteran_status: e.target.value})} className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">-- Select Veteran Status --</option>
                    <option value="I am a protected veteran">I am a protected veteran</option>
                    <option value="I am not a protected veteran">I am not a protected veteran</option>
                    <option value="Decline to self-identify">Decline to self-identify</option>
                  </select>
                  <select value={editing.disability_status || ''} onChange={e => setEditing({...editing, disability_status: e.target.value})} className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">-- Select Disability Status --</option>
                    <option value="Yes, I have a disability">Yes, I have a disability</option>
                    <option value="No, I do not have a disability">No, I do not have a disability</option>
                    <option value="Decline to self-identify">Decline to self-identify</option>
                  </select>
                  <select value={editing.marital_status || ''} onChange={e => setEditing({...editing, marital_status: e.target.value})} className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">-- Select Marital Status --</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Decline to self-identify">Decline to self-identify</option>
                  </select>
                  <input placeholder="Religion (Optional)" value={editing.religion || ''} onChange={e => setEditing({...editing, religion: e.target.value})} className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" />
                  <input placeholder="Nationality" value={editing.nationality || ''} onChange={e => setEditing({...editing, nationality: e.target.value})} className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500" />
                  <input placeholder="Date of Birth (YYYY-MM-DD)" type="date" value={editing.date_of_birth || ''} onChange={e => setEditing({...editing, date_of_birth: e.target.value})} className="border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 col-span-2" />
                </div>
              </section>

              {/* Custom Q&A */}
              <section>
                <div className="flex justify-between items-center border-b pb-2 mb-4">
                  <h3 className="text-xl font-bold text-gray-800">Custom Q&A (For AI)</h3>
                  <button onClick={() => setEditing({...editing, qa: [...(editing.qa || []), {question:'', answer:''}]})} className="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded-md hover:bg-purple-200 font-bold">+ Add Q&A</button>
                </div>
                <div className="space-y-3">
                  {(editing.qa || []).map((qa, idx) => (
                    <div key={idx} className="flex gap-2 items-start bg-gray-50 p-3 rounded-xl border border-gray-100 relative">
                      <div className="flex-1 space-y-2">
                        <input placeholder="Question (e.g. Desired Salary, Sponsorship)" value={qa.question || ''} onChange={e => { const newArr = [...editing.qa!]; newArr[idx].question = e.target.value; setEditing({...editing, qa: newArr})}} className="w-full bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 p-2 font-medium" />
                        <textarea placeholder="Answer (e.g. 120,000 - 130,000)" value={qa.answer || ''} onChange={e => { const newArr = [...editing.qa!]; newArr[idx].answer = e.target.value; setEditing({...editing, qa: newArr})}} className="w-full bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 p-2 h-16 resize-none" />
                      </div>
                      <button onClick={() => setEditing({...editing, qa: editing.qa!.filter((_, i) => i !== idx)})} className="text-gray-400 hover:text-red-500 rounded-full p-2 bg-white border shadow-sm">&times;</button>
                    </div>
                  ))}
                  {(!editing.qa || editing.qa.length === 0) && <p className="text-gray-400 text-sm italic w-full">No custom Q&A added.</p>}
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
