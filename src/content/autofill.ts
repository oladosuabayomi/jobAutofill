import { fillForm } from '../lib/fieldMatcher'
import type { Candidate } from '../lib/types'

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.action === 'INJECT_CANDIDATE') {
    const candidate: Candidate = message.candidate
    const report = fillForm(candidate)
    sendResponse(report)
  }
})
