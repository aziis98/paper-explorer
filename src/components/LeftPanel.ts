import type { Paper } from '../types'
import { $, trunc, fmt } from '../utils'

export interface LeftPanelOptions {
  onPaperClick: (paper: Paper) => void
  onRemovePaper: (id: string) => void
  onExport: (type: 'primary' | 'all') => void
}

export function LeftPanel(el: HTMLElement, options: LeftPanelOptions) {
  el.innerHTML = ''
  
  const header = $('div', { className: 'sidebar-header', style: { flexDirection: 'column', alignItems: 'stretch', gap: '12px' } }, 
    $('div', { style: 'display: flex; justify-content: space-between; align-items: center' },
      $('h2', {}, 'Graph Papers'),
      $('span', { id: 'totals-badge', style: { fontSize: '10px', color: '#94a3b8', fontWeight: '600' } })
    ),
    $('div', { style: 'display: flex; gap: 8px; align-items: center' },
      $('button', { className: 'export-btn', onClick: () => options.onExport('primary') }, $('iconify-icon', {icon: 'mdi:download'}), 'Primary .bib'),
      $('button', { className: 'export-btn', onClick: () => options.onExport('all') }, $('iconify-icon', {icon: 'mdi:download'}), 'All .bib'),
      $('div', { className: 'info-popup-container', style: { marginLeft: 'auto' } },
        $('iconify-icon', { icon: 'mdi:information-outline', style: 'font-size: 16px' }),
        $('div', { className: 'info-popup-content' },
          $('strong', {}, 'BibTeX Export Specification'),
          $('p', { style: 'margin-top: 6px; color: #64748b' }, 'The exported file will be a plaintext .bib file formatted for compatibility with LaTeX and modern reference managers (Zotero, Mendeley, etc).'),
          $('pre', {}, `@article{Einstein1905W312345678,
  title = {On the Electrodynamics of Moving Bodies},
  author = {Einstein and others},
  year = {1905},
  doi = {10.1002/andp.19053221004},
  url = {https://openalex.org/W312345678}
}`),
          $('ul', { style: 'margin-top: 6px; padding-left: 16px; color: #64748b; list-style-type: disc' },
            $('li', { style: 'margin-bottom: 4px' }, $('strong', { style: 'color: #334155' }, 'Citation Key: '), 'Generated as ', $('code', { style: 'background: #f1f5f9; padding: 2px 4px; border-radius: 3px; font-size: 9px' }, 'FirstAuthorYear + OpenAlexID'), ' to guarantee uniqueness.'),
            $('li', { style: 'margin-bottom: 4px' }, $('strong', { style: 'color: #334155' }, 'Authors: '), 'Last names are properly delimited with ', $('code', { style: 'background: #f1f5f9; padding: 2px 4px; border-radius: 3px; font-size: 9px' }, 'and'), ', or truncated with ', $('code', { style: 'background: #f1f5f9; padding: 2px 4px; border-radius: 3px; font-size: 9px' }, 'and others'), '.'),
            $('li', {}, $('strong', { style: 'color: #334155' }, 'Fields: '), 'Includes title, year, clean DOI, and the original OpenAlex URL.')
          )
        )
      )
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

      const createItem = (p: Paper, isMain: boolean) => {
        const isSelected = p.id === selectedId
        return $(
          'div',
          {
            title: isMain ? '' : 'Click to make this a primary node',
            style: {
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              padding: '8px',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              background: isSelected ? '#e2e8f0' : 'transparent',
              opacity: isMain ? '1' : '0.5',
            },
            onMouseEnter: (e: MouseEvent) => {
              if (!isSelected) {
                ;(e.currentTarget as HTMLElement).style.background = '#f1f5f9'
              }
            },
            onMouseLeave: (e: MouseEvent) => {
              if (!isSelected) {
                ;(e.currentTarget as HTMLElement).style.background = 'transparent'
              }
            },
            onClick: () => options.onPaperClick(p),
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
      }

      if (direct.length > 0) {
        list.appendChild(
          $('div', {
            style: {
              fontSize: '11px',
              fontWeight: '700',
              color: '#64748b',
              textTransform: 'uppercase',
              padding: '12px 8px 6px',
              letterSpacing: '0.05em',
            },
          }, 'Primary Papers')
        )
        direct.forEach(p => list.appendChild(createItem(p, true)))
      }

      if (secondary.length > 0) {
        list.appendChild(
          $('div', {
            style: {
              fontSize: '11px',
              fontWeight: '700',
              color: '#64748b',
              textTransform: 'uppercase',
              padding: '16px 8px 6px',
              letterSpacing: '0.05em',
            },
          }, 'Secondary Papers')
        )
        secondary.forEach(p => list.appendChild(createItem(p, false)))
      }
    },
    unmount() {
      el.removeEventListener('mousedown', mousedownHandler)
      el.removeEventListener('wheel', wheelHandler)
    },
  }
}
