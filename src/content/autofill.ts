import { fillForm } from '../lib/fieldMatcher'
import type { Candidate } from '../lib/types'
import { generateAnswer } from '../lib/ai'

chrome.runtime.onMessage.addListener((message: any, _sender: any, sendResponse: any) => {
  if (message.action === 'INJECT_CANDIDATE') {
    const candidate: Candidate = message.candidate
    const report = fillForm(candidate)
    
    // Attach AI Assist buttons to elements that need review (yellow border)
    attachAIAssistButtons(candidate)
    
    sendResponse(report)
  }
})

function attachAIAssistButtons(candidate: Candidate) {
  const elements = Array.from(document.querySelectorAll<HTMLTextAreaElement>('textarea'))
  
  for (const el of elements) {
    if (el.style.border.includes('rgb(234, 179, 8)') || el.style.border.includes('eab308')) {
      if (el.parentElement?.querySelector('.ai-assist-btn')) continue
      
      const btn = document.createElement('button')
      btn.className = 'ai-assist-btn'
      btn.innerHTML = '✨ AI Answer'
      btn.style.cssText = `
        position: absolute;
        right: 8px;
        bottom: 8px;
        background: #2563eb;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 4px 8px;
        font-size: 12px;
        cursor: pointer;
        z-index: 10000;
        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
        font-family: system-ui, sans-serif;
      `
      
      // Wrap the textarea to position the absolute button correctly
      const wrapper = document.createElement('div')
      wrapper.style.position = 'relative'
      wrapper.style.display = 'inline-block'
      wrapper.style.width = el.offsetWidth ? `${el.offsetWidth}px` : '100%'
      
      el.parentNode?.insertBefore(wrapper, el)
      wrapper.appendChild(el)
      wrapper.appendChild(btn)
      
      btn.onclick = async (e) => {
        e.preventDefault()
        const question = getQuestionLabel(el) || 'Answer this question based on my background.'
        btn.innerHTML = '⏳ Thinking...'
        btn.disabled = true
        try {
          const answer = await generateAnswer(question, candidate)
          const nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
          nativeSetter?.call(el, answer)
          el.dispatchEvent(new Event('input', { bubbles: true }))
          el.dispatchEvent(new Event('change', { bubbles: true }))
          btn.innerHTML = '✅ Done'
          el.style.border = '2px solid #22c55e' // Turn green
        } catch (err) {
          btn.innerHTML = '❌ Error'
          console.error(err)
          alert(String(err))
        }
        setTimeout(() => {
          btn.innerHTML = '✨ AI Answer'
          btn.disabled = false
        }, 3000)
      }
    }
  }
}

function getQuestionLabel(el: HTMLElement): string {
  if (el.id) {
    const label = document.querySelector(`label[for="${el.id}"]`)
    if (label) return label.textContent?.trim() ?? ''
  }
  const aria = el.getAttribute('aria-label')
  if (aria) return aria.trim()
  const parent = el.closest('[class*="field"], [class*="input"], [class*="form"]')
  if (parent) return parent.textContent?.trim().split('\n')[0] ?? ''
  return ''
}
