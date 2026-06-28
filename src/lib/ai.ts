import type { Candidate } from './types'

export type AIProvider = 'claude' | 'openai' | 'gemini'

const getApiConfig = (): Promise<{ provider: AIProvider, apiKey: string }> =>
  new Promise(resolve => chrome.storage.local.get(['aiProvider', 'aiApiKey'], (r: any) => resolve({
    provider: (r.aiProvider as AIProvider) || 'claude',
    apiKey: r.aiApiKey || ''
  })))

export const generateAnswer = async (question: string, candidate: Candidate): Promise<string> => {
  const { provider, apiKey } = await getApiConfig()
  
  if (!apiKey) throw new Error(`API Key not configured for ${provider} in Settings.`)

  const context = `
Candidate: ${candidate.first_name} ${candidate.last_name}
Title: ${candidate.job_title ?? 'Not specified'}
Experience: ${candidate.years_exp ?? '?'} years
Education: ${candidate.degree ?? ''} in ${candidate.field_of_study ?? ''} from ${candidate.university ?? ''}
${candidate.qa?.map(qa => `Q: ${qa.question}\nA: ${qa.answer}`).join('\n\n') ?? ''}
  `.trim()

  const systemPrompt = `You are writing a job application answer on behalf of a candidate. Be genuine, specific, and concise (2-4 sentences max).

Candidate background:
${context}

Write only the answer, no preamble.`

  if (provider === 'claude') {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20240620',
        max_tokens: 300,
        system: systemPrompt,
        messages: [{ role: 'user', content: question }]
      })
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error.message)
    return data.content[0].text
  } 
  
  if (provider === 'openai') {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
        max_tokens: 300
      })
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error.message)
    return data.choices[0].message.content
  }

  if (provider === 'gemini') {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: question }] }]
      })
    })
    const data = await res.json()
    if (data.error) throw new Error(data.error.message)
    return data.candidates[0].content.parts[0].text
  }

  throw new Error(`Unsupported AI provider: ${provider}`)
}
