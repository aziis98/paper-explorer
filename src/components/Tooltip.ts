import type { Paper } from '../types'
import { $, trunc, fmt } from '../utils'

export function Tooltip(el: HTMLElement) {
  el.innerHTML = ''
  
  const ttTitle = $('div', { id: 'tt-title', className: 'tt-title' })
  const ttAuth = $('div', { id: 'tt-auth', className: 'tt-auth' })
  const ttYear = $('div', { id: 'tt-year', className: 'tt-year' })
  const ttCites = $('div', { id: 'tt-cites', className: 'tt-cites' })
  const ttHint = $('div', { id: 'tt-hint', className: 'tt-hint' }, 'Click to see details & citations')

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
