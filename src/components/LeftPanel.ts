import type { Paper } from '../types'
import { $, trunc, fmt } from '../utils'

export interface LeftPanelOptions {
  onPaperClick: (paper: Paper) => void
  onRemovePaper: (id: string) => void
}

export function LeftPanel(el: HTMLElement, options: LeftPanelOptions) {
  el.innerHTML = ''
  
  const header = $('div', { className: 'sidebar-header' }, 
    $('h2', {}, 'Graph Papers'),
    $('div', { style: 'display: flex; align-items: center; gap: 10px' },
      $('span', { id: 'totals-badge', style: { fontSize: '10px', color: '#94a3b8', fontWeight: '600' } })
    )
  )

  const list = $('div', { id: 'papers-list', style: { flex: '1', overflowY: 'auto', padding: '10px' } })
  const emptyMsg = $('div', { id: 'empty-msg', style: { padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' } }, 
    $('iconify-icon', { icon: 'mdi:Graph-outline', style: 'font-size: 32px; opacity: 0.3; margin-bottom: 10px' }),
    $('p', {}, 'Graph is empty. Search and add papers to start exploring.')
  )
  
  const totalsBadge = header.querySelector('#totals-badge') as HTMLElement | null

  el.append(header, list)
  list.appendChild(emptyMsg)

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
              background: p.isRef ? '#64748b' : p.color,
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
                  color: p.isRef ? '#94a3b8' : '#1e293b',
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
