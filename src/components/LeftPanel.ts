import type { Paper } from '../types'
import { $, trunc, fmt } from '../utils'

export interface LeftPanelOptions {
  onPaperClick: (paper: Paper) => void
  onRemovePaper: (id: string) => void
}

export function LeftPanel(el: HTMLElement, options: LeftPanelOptions) {
  const emptyMsg = el.querySelector('#empty-msg') as HTMLElement | null
  const totalsBadge = el.querySelector('#totals-badge') as HTMLElement | null
  const list = el.querySelector('#papers-list') as HTMLElement | null

  // Setup mousedown/wheel blocker so it doesn't pan/zoom the map
  const mousedownHandler = (e: Event) => e.stopPropagation()
  const wheelHandler = (e: Event) => e.stopPropagation()
  el.addEventListener('mousedown', mousedownHandler)
  el.addEventListener('wheel', wheelHandler, { passive: false })

  return {
    update(papers: Paper[], selectedId: string | null) {
      const direct = papers.filter(p => !p.isRef)
      const secondary = papers.filter(p => p.isRef)
      const sorted = [...direct, ...secondary]

      if (emptyMsg) {
        emptyMsg.style.display = direct.length ? 'none' : 'block'
      }

      const refs = papers.length - direct.length
      if (totalsBadge) {
        totalsBadge.textContent = refs
          ? `${direct.length} + ${refs} refs`
          : direct.length
            ? `${direct.length}`
            : ''
      }

      if (!list) return
      list.innerHTML = ''

      sorted.forEach(p => {
        const isMain = !p.isRef
        const isSelected = p.id === selectedId
        const item = $(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '8px',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              background: isSelected ? '#e2e8f0' : 'transparent',
            },
            onMouseEnter: (e: MouseEvent) => {
              if (p.id !== selectedId) {
                ;(e.currentTarget as HTMLElement).style.background = '#f1f5f9'
              }
            },
            onMouseLeave: (e: MouseEvent) => {
              if (p.id !== selectedId) {
                ;(e.currentTarget as HTMLElement).style.background = 'transparent'
              }
            },
            onClick: () => options.onPaperClick(p),
            opacity: isMain ? '1' : '0.5',
          },
          $('span', {
            style: {
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: p.color,
              flexShrink: '0',
              marginTop: '4px',
            },
          }),
          $(
            'div',
            { style: { flex: '1', minWidth: '0' } },
            $(
              'p',
              {
                style: {
                  fontSize: '11px',
                  fontWeight: '500',
                  color: '#1e293b',
                  lineHeight: '1.4',
                },
              },
              trunc(p.title, 58),
            ),
            $(
              'p',
              {
                style: {
                  fontSize: '10px',
                  color: '#94a3b8',
                  marginTop: '2px',
                },
              },
              `${p.date || p.year || '?'} · ${fmt(p.citations)} citations`,
            ),
            p.isRef
              ? $(
                  'span',
                  {
                    style: {
                      fontSize: '9px',
                      color: '#6366f1',
                      background: '#eef2ff',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      marginLeft: 'auto',
                      fontWeight: '600',
                    },
                  },
                  'SECONDARY',
                )
              : null,
          ),
          $(
            'button',
            {
              style: {
                background: '#fee2e2',
                border: 'none',
                cursor: 'pointer',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                fontSize: '9px',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: '0',
                opacity: '0.6',
                transition: 'opacity 0.2s',
              },
              onMouseEnter: (e: MouseEvent) => {
                ;(e.currentTarget as HTMLElement).style.opacity = '1'
              },
              onMouseLeave: (e: MouseEvent) => {
                ;(e.currentTarget as HTMLElement).style.opacity = '0.6'
              },
              onClick: (e: MouseEvent) => {
                e.stopPropagation()
                options.onRemovePaper(p.id)
              },
            },
            '✕',
          ),
        )
        list.appendChild(item)
      })
    },
    unmount() {
      el.removeEventListener('mousedown', mousedownHandler)
      el.removeEventListener('wheel', wheelHandler)
    },
  }
}
