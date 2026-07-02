import { fillForm } from '../lib/fieldMatcher'
import type { Candidate } from '../lib/types'
import { generateAnswer } from '../lib/ai'

chrome.runtime.onMessage.addListener((message: any, _sender: any, sendResponse: any) => {
  if (message.action === 'INJECT_CANDIDATE') {
    const candidate: Candidate = message.candidate
    fillForm(candidate).then(report => {
      attachAIAssistButtons(candidate)
      sendResponse(report)
    })
    return true // Keep channel open
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

// Phase 12.1: Floating Action Button
function injectFloatingButton() {
  chrome.storage.local.get(['activeCandidateId', 'activeCandidateName'], (res) => {
    if (res.activeCandidateId && res.activeCandidateName) {
      if (document.getElementById('job-autofill-fab')) return

      const fabContainer = document.createElement('div')
      fabContainer.id = 'job-autofill-fab'
      fabContainer.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 999999; display: flex; flex-direction: column; align-items: flex-end; gap: 10px;'

      // The menu container (hidden by default)
      const menuContainer = document.createElement('div')
      menuContainer.style.cssText = `
        display: none;
        flex-direction: column;
        gap: 8px;
        background: white;
        padding: 12px;
        border-radius: 12px;
        box-shadow: 0 10px 25px -5px rgba(0,0,0,0.2);
        border: 1px solid #e2e8f0;
        margin-bottom: 8px;
      `

      // AI Button
      const aiButton = document.createElement('button')
      aiButton.innerHTML = `✨ Answer Questions`
      aiButton.style.cssText = `background: #8b5cf6; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-family: system-ui, sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; text-align: center;`
      aiButton.onclick = async (e) => {
        e.preventDefault()
        
        const targets = Array.from(document.querySelectorAll('textarea, input[type="text"]'))
          .filter(el => {
            const inputEl = el as HTMLInputElement | HTMLTextAreaElement;
            if (inputEl.value.trim()) return false;
            if (el.tagName === 'TEXTAREA') return true;
            let label = '';
            if (el.id) {
              const labelEl = document.querySelector(`label[for="${el.id}"]`);
              if (labelEl) label = labelEl.textContent || '';
            }
            if (!label) {
              label = el.closest('label')?.textContent || el.getAttribute('aria-label') || inputEl.placeholder || inputEl.name || '';
            }
            if (label.includes('?') || label.split(' ').length > 2) return true;
            return false;
          }) as (HTMLInputElement | HTMLTextAreaElement)[];

        const showModal = (title: string, text: string, isError: boolean = false) => {
          const overlay = document.createElement('div');
          overlay.style.cssText = `position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); z-index: 9999999; display: flex; align-items: center; justify-content: center;`;
          const card = document.createElement('div');
          card.style.cssText = `background: white; padding: 24px; border-radius: 16px; width: 450px; max-width: 90%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); font-family: system-ui, sans-serif;`;
          const header = document.createElement('h3');
          header.innerText = title;
          header.style.cssText = `margin: 0 0 16px 0; font-size: 18px; color: ${isError ? '#ef4444' : '#8b5cf6'}`;
          const textArea = document.createElement('textarea');
          textArea.value = text;
          textArea.readOnly = true;
          textArea.style.cssText = `width: 100%; height: 150px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 14px; margin-bottom: 16px; resize: none; background: #f8fafc; box-sizing: border-box;`;
          const btnContainer = document.createElement('div');
          btnContainer.style.cssText = 'display: flex; justify-content: flex-end; gap: 12px;';
          const closeBtn = document.createElement('button');
          closeBtn.innerText = 'Close';
          closeBtn.style.cssText = 'padding: 8px 16px; border: none; background: #f1f5f9; color: #475569; border-radius: 8px; cursor: pointer; font-weight: 500;';
          closeBtn.onclick = () => overlay.remove();
          const copyBtn = document.createElement('button');
          copyBtn.innerText = '📋 Copy to Clipboard';
          copyBtn.style.cssText = `padding: 8px 16px; border: none; background: ${isError ? '#ef4444' : '#8b5cf6'}; color: white; border-radius: 8px; cursor: pointer; font-weight: 500;`;
          copyBtn.onclick = () => { navigator.clipboard.writeText(text); copyBtn.innerText = '✅ Copied!'; setTimeout(() => copyBtn.innerText = '📋 Copy to Clipboard', 2000); };
          btnContainer.appendChild(closeBtn); btnContainer.appendChild(copyBtn);
          card.appendChild(header); card.appendChild(textArea); card.appendChild(btnContainer);
          overlay.appendChild(card); document.body.appendChild(overlay);
        };

        if (targets.length === 0) {
          const manualQuestion = prompt("I couldn't automatically detect the question box on this specific webpage.\n\nPlease copy-paste the question here and I will generate an answer for you to copy!")
          if (!manualQuestion) return
          aiButton.innerHTML = '⏳ Thinking...'
          const response = await new Promise<any>((resolve) => {
            chrome.runtime.sendMessage({ action: 'ASK_AI', question: manualQuestion, candidateId: res.activeCandidateId }, resolve)
          })
          if (response?.answer) showModal('✨ AI Generated Response', response.answer);
          else showModal('❌ AI Error', response?.error || 'Unknown Error', true);
          aiButton.innerHTML = '✨ Answer Questions'
          return
        }

        aiButton.innerHTML = `⏳ Answering ${targets.length}...`
        let successCount = 0
        for (const ta of targets) {
          let label = ''
          if (ta.id) { const labelEl = document.querySelector(`label[for="${ta.id}"]`); if (labelEl) label = labelEl.textContent || ''; }
          if (!label) label = ta.closest('label')?.textContent || ta.getAttribute('aria-label') || ta.placeholder || ta.name || 'Unknown Question';
          ta.style.border = '2px solid #8b5cf6'
          ta.placeholder = '✨ AI is thinking...'
          const response = await new Promise<any>((resolve) => { chrome.runtime.sendMessage({ action: 'ASK_AI', question: label.trim(), candidateId: res.activeCandidateId }, resolve) })
          if (response?.answer) {
            ta.value = response.answer
            ta.dispatchEvent(new Event('input', { bubbles: true }))
            ta.dispatchEvent(new Event('change', { bubbles: true }))
            ta.style.border = '2px solid #10b981'
            successCount++
          } else if (response?.error) {
            ta.style.border = '2px solid #ef4444'
            ta.placeholder = 'AI Error: ' + response.error
          }
        }
        aiButton.innerHTML = `🎉 Done!`
        setTimeout(() => aiButton.innerHTML = '✨ Answer Questions', 3000)
      }

      // Log Button
      const logButton = document.createElement('button')
      logButton.innerHTML = `💾 Log Application`
      logButton.style.cssText = `background: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-family: system-ui, sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; text-align: center;`
      logButton.onclick = (e) => {
        e.preventDefault()
        const company = prompt('Enter the company name for this application:')
        if (!company) return // User cancelled or left empty
        
        logButton.innerHTML = `⏳ Logging...`
        chrome.runtime.sendMessage({ action: 'LOG_APPLICATION', candidateId: res.activeCandidateId, company, url: window.location.href }, (response) => {
          if (response?.ok) {
            logButton.innerHTML = `✅ Logged!`
          } else {
            logButton.innerHTML = `❌ Error`
            alert(typeof response?.error === 'object' ? JSON.stringify(response.error) : (response?.error || 'Unknown Error'))
          }
          setTimeout(() => logButton.innerHTML = '💾 Log Application', 3000)
        })
      }

      // Fill Button
      const fillButton = document.createElement('button')
      fillButton.innerHTML = `⚡ Auto-Fill Form`
      fillButton.style.cssText = `background: #0f172a; color: white; border: none; padding: 8px 16px; border-radius: 8px; font-family: system-ui, sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; text-align: center;`
      fillButton.onclick = (e) => {
        e.preventDefault()
        chrome.runtime.sendMessage({ action: 'FILL_FORM', candidateId: res.activeCandidateId, tabId: 0 })
      }

      menuContainer.appendChild(fillButton)
      menuContainer.appendChild(aiButton)
      menuContainer.appendChild(logButton)

      // Main FAB (+)
      const fab = document.createElement('button')
      fab.innerHTML = `➕`
      fab.title = `Job Autofill Menu`
      fab.style.cssText = `
        background: #2563eb; color: white; border: none; width: 48px; height: 48px; border-radius: 24px;
        font-size: 24px; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: all 0.2s;
        display: flex; align-items: center; justify-content: center;
      `
      
      let menuOpen = false;
      fab.onclick = (e) => {
        e.preventDefault()
        menuOpen = !menuOpen;
        if (menuOpen) {
          menuContainer.style.display = 'flex';
          fab.innerHTML = `✖`;
          fab.style.transform = 'rotate(90deg)';
        } else {
          menuContainer.style.display = 'none';
          fab.innerHTML = `➕`;
          fab.style.transform = 'rotate(0deg)';
        }
      }

      fabContainer.appendChild(menuContainer)
      fabContainer.appendChild(fab)
      document.body.appendChild(fabContainer)
    }
  })
}

// Run the injection logic when the page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectFloatingButton)
} else {
  injectFloatingButton()
}
