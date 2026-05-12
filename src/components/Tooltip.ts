import type { Paper } from '../types'
import { $, trunc, fmt } from '../utils'

export function Tooltip(el: HTMLElement) {
  el.innerHTML = ''
  
  const ttTitle = $('div', { id: 'tt-title', style: 'font-weight: 700; color: #1e293b; margin-bottom: 2px' })
  const ttAuth = $('div', { id: 'tt-auth', style: 'font-size: 11px; color: #64748b; margin-bottom: 4px' })
  const ttYear = $('div', { id: 'tt-year', style: 'font-size: 10px; color: #94a3b8; display: inline-block' })
  const ttCites = $('div', { id: 'tt-cites', style: 'font-size: 10px; color: #6366f1; display: inline-block; margin-left: 8px; font-weight: 600' })
  const ttHint = $('div', { id: 'tt-hint', style: 'font-size: 9px; color: #94a3b8; margin-top: 8px; font-style: italic' }, 'Click to see details & citations')

  el.append(ttTitle, ttAuth, ttYear, ttCites, ttHint)

  return {
    show(d: Paper, ev: MouseEvent) {
      if (ttTitle) ttTitle.textContent = trunc(d.title, 80)
      if (ttAuth) ttAuth.textContent = d.authors
      if (ttYear) ttYear.textContent = d.date || d.year?.toString() || '?'
      if (ttCites) ttCites.textContent = fmt(d.citations)
      if (ttHint) ttHint.style.display = d.refsLoaded ? 'none' : 'block'

      el.style.display = 'block'
      el.style.left = Math.min(ev.clientX + 16, window.innerWidth - 250) + 'px'
      el.style.top = Math.min(ev.clientY - 8, window.innerHeight - 120) + 'px'
    },
    hide() {
      el.style.display = 'none'
    },
    unmount() {
      el.style.display = 'none'
    },
  }
}
