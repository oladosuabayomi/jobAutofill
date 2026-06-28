import { getCandidate, logApplication } from '../lib/supabase'

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'FILL_FORM') {
    handleFill(message.candidateId, message.tabId).then(sendResponse)
    return true // keep channel open for async response
  }
  if (message.action === 'LOG_APPLICATION') {
    logApplication(message.payload).then(() => sendResponse({ ok: true }))
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
