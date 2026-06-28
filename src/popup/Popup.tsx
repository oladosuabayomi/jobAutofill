import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { getCandidates, getCredentials } from '../lib/supabase'
import type { Candidate, FillReport, CandidateCredential } from '../lib/types'

type Tab = 'autofill' | 'credentials'
type State = 'idle' | 'filling' | 'done' | 'error'

export default function Popup() {
  const [activeTab, setActiveTab] = useState<Tab>('autofill')
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  
  const [state, setState] = useState<State>('idle')
  const [report, setReport] = useState<FillReport | null>(null)
  const [error, setError] = useState('')
  
  const [credentials, setCredentials] = useState<CandidateCredential[]>([])

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
    <div className="flex flex-col h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
        <span className="font-semibold text-gray-800 flex items-center gap-2">
          <span className="text-xl">🤖</span> Job Autofill
        </span>
        <button
          onClick={() => chrome.runtime.openOptionsPage()}
          className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline"
        >
          ⚙ Manage
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('autofill')}
          className={`flex-1 py-2 text-sm font-medium ${activeTab === 'autofill' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Autofill
        </button>
        <button
          onClick={() => setActiveTab('credentials')}
          className={`flex-1 py-2 text-sm font-medium ${activeTab === 'credentials' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Credentials
        </button>
      </div>

      {state === 'idle' && (
        <div className="flex flex-col h-full overflow-hidden">
          <div className="px-4 py-3 border-b">
            <input
              type="text"
              placeholder="🔍 Search candidates..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
            />
          </div>

          <div className="flex-1 overflow-y-auto px-2 py-2">
            {filtered.length === 0 ? (
              <div className="text-center text-sm text-gray-500 mt-4">No candidates found</div>
            ) : (
              filtered.map(c => (
                <div
                  key={c.id}
                  onClick={() => setSelected(c.id)}
                  className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer mb-1 transition-colors ${
                    selected === c.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0 shadow-sm">
                    {c.first_name[0]}{c.last_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 truncate">{c.first_name} {c.last_name}</div>
                    <div className="text-xs text-gray-500 truncate">{c.email}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{c.job_title ?? 'No title'}</div>
                  </div>
                </div>
              ))
            )}
          </div>

          {activeTab === 'autofill' && (
            <div className="px-4 py-3 border-t bg-gray-50">
              <button
                onClick={handleFill}
                disabled={!selected}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700 transition shadow-sm"
              >
                ▶ Fill Form
              </button>
            </div>
          )}

          {activeTab === 'credentials' && selected && (
             <div className="h-48 border-t bg-gray-50 overflow-y-auto p-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Saved Platforms</h4>
                {credentials.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-4">No credentials saved yet.</p>
                ) : (
                  <div className="space-y-2">
                    {credentials.map(cred => (
                      <div key={cred.id} className="flex justify-between items-center bg-white p-2 rounded border shadow-sm">
                        <span className="text-sm font-medium truncate">{cred.platform}</span>
                        <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">✅ Saved</span>
                      </div>
                    ))}
                  </div>
                )}
             </div>
          )}
        </div>
      )}

      {state === 'filling' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-600 font-medium">Scanning & Filling...</p>
        </div>
      )}

      {state === 'done' && report && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
          <div className="text-5xl">✅</div>
          <p className="text-base font-semibold text-gray-800">Form Filled</p>
          <div className="text-sm text-gray-600 space-y-2 bg-gray-50 p-4 rounded-lg w-full">
            <div className="flex justify-between"><span>✅ Filled:</span> <span className="font-medium">{report.filled}</span></div>
            <div className="flex justify-between"><span>⏭ Skipped:</span> <span className="font-medium">{report.skipped}</span></div>
            {report.needsReview.length > 0 && (
              <div className="flex justify-between text-yellow-600"><span>🟡 Review Needed:</span> <span className="font-medium">{report.needsReview.length}</span></div>
            )}
          </div>
          <button onClick={() => { setState('idle'); setReport(null); }}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium hover:underline mt-2">
            Fill another
          </button>
        </div>
      )}

      {state === 'error' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
          <div className="text-5xl">❌</div>
          <p className="text-sm font-medium text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>
          <button onClick={() => setState('idle')} className="text-sm text-blue-600 hover:text-blue-800 font-medium hover:underline mt-2">
            Try again
          </button>
        </div>
      )}
    </div>
  )
}

const root = createRoot(document.getElementById('root')!)
root.render(<Popup />)
