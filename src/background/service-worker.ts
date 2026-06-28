import { getCandidate, logApplication } from '../lib/supabase'

chrome.runtime.onMessage.addListener((message: any, _sender: any, sendResponse: any) => {
  if (message.action === 'FILL_FORM') {
    handleFill(message.candidateId, message.tabId).then(sendResponse)
    return true // keep channel open for async response
  }
  if (message.action === 'LOG_APPLICATION') {
    logApplication({
      candidate_id: message.candidateId,
      company: message.company,
      url: message.url,
      status: 'applied'
    })
      .then(() => sendResponse({ ok: true }))
      .catch(err => sendResponse({ error: typeof err === 'object' ? JSON.stringify(err) : String(err) }))
    return true
  }
  if (message.action === 'FETCH_ACTIVE_CANDIDATE') {
    chrome.storage.local.get('activeCandidateId', (res: any) => {
      if (res.activeCandidateId) {
        getCandidate(res.activeCandidateId)
          .then(candidate => sendResponse({ candidate }))
          .catch(err => sendResponse({ error: String(err) }))
      } else {
        sendResponse({ error: 'No active candidate' })
      }
    })
    return true
  }

  if (message.action === 'ASK_AI') {
    chrome.storage.local.get(['aiProvider', 'aiApiKey'], async (res: any) => {
      try {
        if (!res.aiProvider || !res.aiApiKey) throw new Error('AI Provider or API Key not set in Dashboard.')
        
        const candidate = await getCandidate(message.candidateId)
        const prompt = `You are an expert career assistant. Based on this candidate's profile, write a concise and professional answer to the following job application question. 
CRITICAL RULE: If the question asks for something specific like desired salary, location preference, or sponsorship requirements, you MUST look in the candidate's "qa" (Custom Q&A) array first and use that exact information. 
Do not include introductory text, just the exact answer.\n\nQuestion: ${message.question}\n\nCandidate Profile:\n${JSON.stringify(candidate, null, 2)}`
        
        let answer = ''
        if (res.aiProvider === 'openai') {
          const apiRes = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${res.aiApiKey}` },
            body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: prompt }] })
          })
          const data = await apiRes.json()
          if (!apiRes.ok) throw new Error(data.error?.message || JSON.stringify(data))
          answer = data.choices?.[0]?.message?.content
        } else if (res.aiProvider === 'claude') {
          const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': String(res.aiApiKey), 'anthropic-version': '2023-06-01', 'anthropic-dangerously-allow-browser': 'true' },
            body: JSON.stringify({ model: 'claude-3-haiku-20240307', max_tokens: 500, messages: [{ role: 'user', content: prompt }] })
          })
          const data = await apiRes.json()
          if (!apiRes.ok) throw new Error(data.error?.message || JSON.stringify(data))
          answer = data.content?.[0]?.text
        } else if (res.aiProvider === 'gemini') {
          const apiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${res.aiApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
          })
          const data = await apiRes.json()
          if (!apiRes.ok) throw new Error(data.error?.message || JSON.stringify(data))
          answer = data.candidates?.[0]?.content?.parts?.[0]?.text
        }

        if (!answer) throw new Error('API request succeeded but returned no text.')
        
        sendResponse({ answer })
      } catch (err: any) {
        sendResponse({ error: err.message })
      }
    })
    return true
  }
})

async function handleFill(candidateId: string, tabId: number) {
  try {
    const candidate = await getCandidate(candidateId)
    const result = await chrome.tabs.sendMessage(tabId, {
      action: 'INJECT_CANDIDATE',
      candidate,
    })
    return result
  } catch (err) {
    return { error: String(err) }
  }
}
