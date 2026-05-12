import type { Paper } from '../types'
import { $, fmt, getMinDate } from '../utils'

export interface RightPanelOptions {
  onRowClick: (w: any) => void
  onClose: () => void
  onLoadRefs: (limit?: number) => void
  onLoadCits: (limit?: number) => void
  onSetTab: (tab: 'refs' | 'cits') => void
  onSetSort: (key: string) => void
}

export function RightPanel(el: HTMLElement, options: RightPanelOptions) {
  el.innerHTML = ''
  
  let refTableBody: HTMLElement
  
  const header = $('div', { className: 'sidebar-header' }, 
    $('div', { style: 'display: flex; align-items: center; gap: 8px' },
      $('div', { id: 'info-color-dot', className: 'info-color-dot' }),
      $('h2', {}, 'Paper Info')
    ),
    $('div', { style: 'display: flex; align-items: center; gap: 8px' },
      $('button', { id: 'info-close', className: 'info-close-btn' }, 
        $('iconify-icon', { icon: 'mdi:close' })
      )
    )
  )

  const infoSection = $('div', { className: 'info-section' },
    $('h1', { id: 'info-title', className: 'info-title' }),
    $('p', { id: 'info-authors', className: 'info-authors' }),
    $('p', { id: 'info-year', className: 'info-year' }),
    $('div', { className: 'info-cites-block' },
      $('div', { style: 'display: flex; flex-direction: column' }, 
        $('span', { className: 'info-cites-label' }, 'Citations'),
        $('span', { id: 'info-cites', className: 'info-cites-value' })
      )
    ),
    $('div', { className: 'info-links' },
      $('a', { id: 'info-doi', target: '_blank', className: 'info-link-btn' }, $('iconify-icon', { icon: 'mdi:link' }), 'DOI'),
      $('a', { id: 'info-arxiv', target: '_blank', className: 'info-link-btn' }, $('iconify-icon', { icon: 'mdi:file-document-outline' }), 'arXiv'),
      $('a', { id: 'info-pdf', target: '_blank', className: 'info-link-btn' }, $('iconify-icon', { icon: 'mdi:file-pdf-box' }), 'PDF')
    )
  )

  const refStatus = $('div', { id: 'ref-status', className: 'ref-status' })
  const actionsSection = $('div', { className: 'actions-section' },
    $('div', { className: 'actions-header' },
      $('span', { className: 'actions-label' }, 'EXPAND GRAPH'),
      refStatus
    ),
    $('div', { className: 'actions-grid' },
      $('button', { id: 'load-refs-10', className: 'expand-btn' }, 'Refs (+10)'),
      $('button', { id: 'load-refs-all', className: 'expand-btn' }, 'Refs (All)'),
      $('button', { id: 'load-cits-10', className: 'expand-btn' }, 'Cits (+10)'),
      $('button', { id: 'load-cits-all', className: 'expand-btn' }, 'Cits (All)')
    )
  )

  const tabsContainer = $('div', { className: 'panel-tabs' },
    $('button', { id: 'tab-refs' }, 'REFERENCES'),
    $('button', { id: 'tab-cits' }, 'CITED IN')
  )

  const tableContainer = $('div', { className: 'table-container' },
    $('table', { className: 'data-table' },
      $('thead', {}, 
        $('tr', {}, 
          $('th', { id: 'th-title' }, 'Title'),
          $('th', { id: 'th-year', style: 'width: 60px' }, 'Year'),
          $('th', { id: 'th-cites', style: 'width: 80px; text-align: right' }, 'Cites')
        )
      ),
      (refTableBody = $('tbody', { id: 'ref-table-body' }))
    )
  )

  const refSpin = $('div', { id: 'ref-spin', className: 'ref-spin' }, 
    $('iconify-icon', { icon: 'mdi:loading', class: 'spin', style: 'font-size: 24px; color: var(--accent-color)' })
  )

  el.append(header, infoSection, actionsSection, tabsContainer, tableContainer, refSpin)

  const infoClose = el.querySelector('#info-close') as HTMLElement | null
  if (infoClose) infoClose.onclick = () => options.onClose()

  el.querySelector('#load-refs-10')?.addEventListener('click', () => options.onLoadRefs(10))
  el.querySelector('#load-refs-all')?.addEventListener('click', () => options.onLoadRefs())
  el.querySelector('#load-cits-10')?.addEventListener('click', () => options.onLoadCits(10))
  el.querySelector('#load-cits-all')?.addEventListener('click', () => options.onLoadCits())

  const tabRefs = el.querySelector('#tab-refs') as HTMLElement | null
  const tabCits = el.querySelector('#tab-cits') as HTMLElement | null
  tabRefs?.addEventListener('click', () => options.onSetTab('refs'))
  tabCits?.addEventListener('click', () => options.onSetTab('cits'))

  el.querySelector('#th-title')?.addEventListener('click', () => options.onSetSort('title'))
  el.querySelector('#th-year')?.addEventListener('click', () => options.onSetSort('year'))
  el.querySelector('#th-cites')?.addEventListener('click', () => options.onSetSort('citations'))

  const colorDot = el.querySelector('#info-color-dot') as HTMLElement | null
  const title = el.querySelector('#info-title') as HTMLElement | null
  const authors = el.querySelector('#info-authors') as HTMLElement | null
  const year = el.querySelector('#info-year') as HTMLElement | null
  const cites = el.querySelector('#info-cites') as HTMLElement | null
  const doi = el.querySelector('#info-doi') as HTMLAnchorElement | null
  const arxiv = el.querySelector('#info-arxiv') as HTMLAnchorElement | null
  const pdf = el.querySelector('#info-pdf') as HTMLAnchorElement | null
  const mousedownHandler = (e: Event) => e.stopPropagation()
  const wheelHandler = (e: Event) => e.stopPropagation()
  el.addEventListener('mousedown', mousedownHandler)
  el.addEventListener('wheel', wheelHandler, { passive: false })

  let currentSortKey = 'citations'
  let currentSortDesc = true
  let currentActiveTab: 'refs' | 'cits' = 'refs'

  return {
    showPaper(p: Paper) {
      if (colorDot) colorDot.style.background = p.color
      if (title) title.textContent = p.title
      if (authors) authors.textContent = p.authors
      if (year) {
        if (p.pubDate && p.createdDate && p.pubDate !== p.createdDate) {
          year.textContent = `Pub: ${p.pubDate} · Created: ${p.createdDate}`
        } else {
          year.textContent = p.date || p.year?.toString() || '?'
        }
      }
      if (cites) cites.textContent = fmt(p.citations)

      if (doi) {
        if (p.doi) {
          doi.href = p.doi.startsWith('http') ? p.doi : 'https://doi.org/' + p.doi
          doi.style.display = 'flex'
        } else {
          doi.style.display = 'none'
        }
      }

      if (arxiv) {
        if (p.arxivUrl) {
          arxiv.href = p.arxivUrl
          arxiv.style.display = 'flex'
        } else {
          arxiv.style.display = 'none'
        }
      }

      if (pdf) {
        if (p.pdfUrl) {
          pdf.href = p.pdfUrl
          pdf.style.display = 'flex'
        } else {
          pdf.style.display = 'none'
        }
      }
    },
    setStatus(message: string, isWorking: boolean) {
      if (refStatus) refStatus.textContent = message
      if (refSpin) refSpin.style.display = isWorking ? 'inline-block' : 'none'
    },
    updateTabsAndSort(tab: 'refs' | 'cits', sortKey: string, sortDesc: boolean) {
      currentActiveTab = tab
      currentSortKey = sortKey
      currentSortDesc = sortDesc

      if (tabRefs && tabCits) {
        if (tab === 'refs') {
          tabRefs.style.color = '#6366f1'
          tabRefs.style.fontWeight = '600'
          tabRefs.style.borderBottomColor = '#6366f1'
          tabCits.style.color = '#94a3b8'
          tabCits.style.fontWeight = '500'
          tabCits.style.borderBottomColor = 'transparent'
        } else {
          tabCits.style.color = '#6366f1'
          tabCits.style.fontWeight = '600'
          tabCits.style.borderBottomColor = '#6366f1'
          tabRefs.style.color = '#94a3b8'
          tabRefs.style.fontWeight = '500'
          tabRefs.style.borderBottomColor = 'transparent'
        }
      }
    },
    renderTable(currentRefs: any[], currentCits: any[], papersInGraphMap: Set<string>) {
      if (!refTableBody) return
      refTableBody.innerHTML = ''

      const data = currentActiveTab === 'refs' ? currentRefs : currentCits

      const sorted = [...data].sort((a, b) => {
        let vA = a[currentSortKey], vB = b[currentSortKey]
        if (currentSortKey === 'title') {
          vA = (a.title || '').toLowerCase()
          vB = (b.title || '').toLowerCase()
        } else if (currentSortKey === 'citations') {
          vA = a.cited_by_count || 0
          vB = b.cited_by_count || 0
        } else if (currentSortKey === 'year') {
          vA = getMinDate(a) || ''
          vB = getMinDate(b) || ''
        }
        return currentSortDesc ? (vA < vB ? 1 : -1) : vA > vB ? 1 : -1
      })

      sorted.forEach(w => {
        const inGraph = papersInGraphMap.has(w.id)
        const row = $(
          'tr',
          {
            className: `ref-row ${inGraph ? 'in-graph' : ''}`,
            onClick: () => options.onRowClick(w),
          },
          $('td', { className: 'td-title', title: w.title }, w.title),
          $('td', { className: 'td-year' }, String(getMinDate(w) || w.publication_year || '?')),
          $('td', { className: 'td-cites' }, fmt(w.cited_by_count || 0)),
        )
        refTableBody.appendChild(row)
      })
    },
    unmount() {
      el.removeEventListener('mousedown', mousedownHandler)
      el.removeEventListener('wheel', wheelHandler)
    },
  }
}
