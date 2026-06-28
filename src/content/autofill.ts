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
      // Don't inject multiple times
      if (document.getElementById('job-autofill-fab')) return

      const fabContainer = document.createElement('div')
      fabContainer.style.position = 'fixed'
      fabContainer.style.bottom = '20px'
      fabContainer.style.right = '20px'
      fabContainer.style.zIndex = '999999'
      fabContainer.style.display = 'flex'
      fabContainer.style.flexDirection = 'column'
      fabContainer.style.gap = '8px'
      fabContainer.id = 'job-autofill-fab'

      const fab = document.createElement('button')
      fab.innerHTML = `⚡ Auto-Fill: ${res.activeCandidateName}`
      fab.style.cssText = `
        background: #0f172a;
        color: white;
        border: 2px solid #334155;
        border-radius: 9999px;
        padding: 12px 24px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        z-index: 2147483647;
        box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3);
        font-family: system-ui, sans-serif;
        transition: transform 0.2s, background 0.2s;
        display: flex;
        align-items: center;
        gap: 8px;
      `

      fab.onmouseover = () => fab.style.transform = 'scale(1.05)'
      fab.onmouseout = () => fab.style.transform = 'scale(1)'

      fab.onclick = (e) => {
        e.preventDefault()
        fab.innerHTML = '⏳ Fetching...'
        chrome.runtime.sendMessage({ action: 'FETCH_ACTIVE_CANDIDATE' }, async (response) => {
          if (chrome.runtime.lastError || !response) {
            fab.innerHTML = '❌ Background Error'
            console.error(chrome.runtime.lastError || 'No response from background.')
            setTimeout(() => fab.innerHTML = `⚡ Auto-Fill: ${res.activeCandidateName}`, 3000)
            return
          }
          if (response?.error) {
            fab.innerHTML = '❌ Error'
            alert(response.error)
            setTimeout(() => fab.innerHTML = `⚡ Auto-Fill: ${res.activeCandidateName}`, 3000)
            return
          }
          
          if (response?.candidate) {
            fab.innerHTML = '⏳ Filling...'
            const candidate: Candidate = response.candidate
            const report = await fillForm(candidate)
            attachAIAssistButtons(candidate)
            
            fab.innerHTML = `✅ Filled (${report.filled})`
            fab.style.background = '#059669' // Green
            fab.style.borderColor = '#047857'
            setTimeout(() => {
              fab.innerHTML = `⚡ Auto-Fill: ${res.activeCandidateName}`
              fab.style.background = '#0f172a'
              fab.style.borderColor = '#334155'
            }, 3000)
          }
        })
      }

      const logButton = document.createElement('button')
      logButton.innerHTML = `✅ Log as Applied`
      logButton.style.cssText = `
        background: #10b981;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 99px;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        transition: all 0.2s;
        text-align: center;
      `
      logButton.onmouseover = () => logButton.style.transform = 'scale(1.05)'
      logButton.onmouseout = () => logButton.style.transform = 'scale(1)'
      logButton.onclick = (e) => {
        e.preventDefault()
        const company = prompt('What company did you just apply to?')
        if (!company) return
        
        logButton.innerHTML = '⏳ Logging...'
        chrome.runtime.sendMessage({ 
          action: 'LOG_APPLICATION', 
          candidateId: res.activeCandidateId,
          company: company,
          url: window.location.origin
        }, (response) => {
          if (chrome.runtime.lastError || !response) {
            logButton.innerHTML = '❌ Error'
            setTimeout(() => logButton.innerHTML = '✅ Log as Applied', 3000)
            return
          }
          if (response?.error) {
            logButton.innerHTML = '❌ Error'
            alert(typeof response.error === 'object' ? JSON.stringify(response.error) : response.error)
            console.error('Supabase Error Payload:', response.error)
            setTimeout(() => logButton.innerHTML = '✅ Log as Applied', 3000)
          } else {
            logButton.innerHTML = '🎉 Logged!'
            setTimeout(() => logButton.innerHTML = '✅ Log as Applied', 3000)
          }
        })
      }

      const aiButton = document.createElement('button')
      aiButton.innerHTML = `✨ Answer Custom Questions`
      aiButton.style.cssText = `
        background: #8b5cf6;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 99px;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        transition: all 0.2s;
        text-align: center;
      `
      aiButton.onmouseover = () => aiButton.style.transform = 'scale(1.05)'
      aiButton.onmouseout = () => aiButton.style.transform = 'scale(1)'
      aiButton.onclick = async (e) => {
        e.preventDefault()
        
        const targets = Array.from(document.querySelectorAll('textarea, input[type="text"]'))
          .filter(el => {
            const inputEl = el as HTMLInputElement | HTMLTextAreaElement;
            if (inputEl.value.trim()) return false; // Skip if already filled
            
            if (el.tagName === 'TEXTAREA') return true; // Always target empty textareas
            
            // For standard text inputs, only target them if they look like a custom question
            let label = '';
            if (el.id) {
              const labelEl = document.querySelector(`label[for="${el.id}"]`);
              if (labelEl) label = labelEl.textContent || '';
            }
            if (!label) {
              label = el.closest('label')?.textContent || el.getAttribute('aria-label') || inputEl.placeholder || inputEl.name || '';
            }
            
            // If the label has a question mark or is longer than 2 words, it's likely a custom question!
            if (label.includes('?') || label.split(' ').length > 2) return true;
            
            return false;
          }) as (HTMLInputElement | HTMLTextAreaElement)[];

        const showModal = (title: string, text: string, isError: boolean = false) => {
          const overlay = document.createElement('div');
          overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0,0,0,0.5); z-index: 9999999;
            display: flex; align-items: center; justify-content: center;
          `;
          
          const card = document.createElement('div');
          card.style.cssText = `
            background: white; padding: 24px; border-radius: 16px; width: 450px; max-width: 90%;
            box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); font-family: system-ui, sans-serif;
          `;
          
          const header = document.createElement('h3');
          header.innerText = title;
          header.style.cssText = `margin: 0 0 16px 0; font-size: 18px; color: ${isError ? '#ef4444' : '#8b5cf6'}`;
          
          const textArea = document.createElement('textarea');
          textArea.value = text;
          textArea.readOnly = true;
          textArea.style.cssText = `
            width: 100%; height: 150px; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px;
            font-size: 14px; margin-bottom: 16px; resize: none; background: #f8fafc;
            box-sizing: border-box;
          `;
          
          const btnContainer = document.createElement('div');
          btnContainer.style.cssText = 'display: flex; justify-content: flex-end; gap: 12px;';
          
          const closeBtn = document.createElement('button');
          closeBtn.innerText = 'Close';
          closeBtn.style.cssText = 'padding: 8px 16px; border: none; background: #f1f5f9; color: #475569; border-radius: 8px; cursor: pointer; font-weight: 500;';
          closeBtn.onclick = () => overlay.remove();
          
          const copyBtn = document.createElement('button');
          copyBtn.innerText = '📋 Copy to Clipboard';
          copyBtn.style.cssText = `padding: 8px 16px; border: none; background: ${isError ? '#ef4444' : '#8b5cf6'}; color: white; border-radius: 8px; cursor: pointer; font-weight: 500;`;
          copyBtn.onclick = () => {
            navigator.clipboard.writeText(text);
            copyBtn.innerText = '✅ Copied!';
            setTimeout(() => copyBtn.innerText = '📋 Copy to Clipboard', 2000);
          };
          
          btnContainer.appendChild(closeBtn);
          btnContainer.appendChild(copyBtn);
          card.appendChild(header);
          card.appendChild(textArea);
          card.appendChild(btnContainer);
          overlay.appendChild(card);
          document.body.appendChild(overlay);
        };

        if (targets.length === 0) {
          const manualQuestion = prompt("I couldn't automatically detect the question box on this specific webpage.\n\nPlease copy-paste the question here and I will generate an answer for you to copy!")
          if (!manualQuestion) {
            aiButton.innerHTML = '✨ Answer Custom Questions'
            return
          }
          
          aiButton.innerHTML = '⏳ AI is thinking...'
          const response = await new Promise<any>((resolve) => {
            chrome.runtime.sendMessage({
              action: 'ASK_AI',
              question: manualQuestion,
              candidateId: res.activeCandidateId
            }, resolve)
          })

          if (response?.answer) {
            showModal('✨ AI Generated Response', response.answer);
            aiButton.innerHTML = '🎉 Done!'
          } else {
            showModal('❌ AI Error', response?.error || 'Unknown Error', true);
            aiButton.innerHTML = '❌ Error'
          }
          setTimeout(() => aiButton.innerHTML = '✨ Answer Custom Questions', 3000)
          return
        }

        aiButton.innerHTML = `⏳ Answering ${targets.length} questions...`
        let successCount = 0

        for (const ta of targets) {
          // Try to find label
          let label = ''
          if (ta.id) {
            const labelEl = document.querySelector(`label[for="${ta.id}"]`)
            if (labelEl) label = labelEl.textContent || ''
          }
          if (!label) {
            label = ta.closest('label')?.textContent || ta.getAttribute('aria-label') || ta.placeholder || ta.name || 'Unknown Question'
          }

          // Show processing indicator
          ta.style.border = '2px solid #8b5cf6'
          ta.placeholder = '✨ AI is thinking...'

          const response = await new Promise<any>((resolve) => {
            chrome.runtime.sendMessage({
              action: 'ASK_AI',
              question: label.trim(),
              candidateId: res.activeCandidateId
            }, resolve)
          })

          if (response?.answer) {
            ta.value = response.answer
            // Trigger react events
            ta.dispatchEvent(new Event('input', { bubbles: true }))
            ta.dispatchEvent(new Event('change', { bubbles: true }))
            ta.style.border = '2px solid #10b981'
            successCount++
          } else if (response?.error) {
            console.error('AI Error:', response.error)
            ta.style.border = '2px solid #ef4444'
            ta.placeholder = 'AI Error: ' + response.error
          }
        }

        aiButton.innerHTML = `🎉 Answered ${successCount}!`
        setTimeout(() => aiButton.innerHTML = '✨ Answer Custom Questions', 3000)
      }

      fabContainer.appendChild(fab)
      fabContainer.appendChild(logButton)
      fabContainer.appendChild(aiButton)
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
