import type { Paper } from '../types'
import { trunc, fmt } from '../utils'

export function Tooltip(el: HTMLElement) {
  const ttTitle = el.querySelector('#tt-title') as HTMLElement | null
  const ttAuth = el.querySelector('#tt-auth') as HTMLElement | null
  const ttYear = el.querySelector('#tt-year') as HTMLElement | null
  const ttCites = el.querySelector('#tt-cites') as HTMLElement | null
  const ttHint = el.querySelector('#tt-hint') as HTMLElement | null

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
