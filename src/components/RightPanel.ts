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
  const colorDot = el.querySelector('#info-color-dot') as HTMLElement | null
  const title = el.querySelector('#info-title') as HTMLElement | null
  const authors = el.querySelector('#info-authors') as HTMLElement | null
  const year = el.querySelector('#info-year') as HTMLElement | null
  const cites = el.querySelector('#info-cites') as HTMLElement | null
  const doi = el.querySelector('#info-doi') as HTMLAnchorElement | null
  const arxiv = el.querySelector('#info-arxiv') as HTMLAnchorElement | null
  const pdf = el.querySelector('#info-pdf') as HTMLAnchorElement | null

  const infoClose = el.querySelector('#info-close') as HTMLElement | null
  if (infoClose) {
    infoClose.onclick = () => options.onClose()
  }

  // Action buttons
  const btnLoadRefs10 = el.querySelector('#load-refs-10')
  const btnLoadRefsAll = el.querySelector('#load-refs-all')
  const btnLoadCits10 = el.querySelector('#load-cits-10')
  const btnLoadCitsAll = el.querySelector('#load-cits-all')
  btnLoadRefs10?.addEventListener('click', () => options.onLoadRefs(10))
  btnLoadRefsAll?.addEventListener('click', () => options.onLoadRefs())
  btnLoadCits10?.addEventListener('click', () => options.onLoadCits(10))
  btnLoadCitsAll?.addEventListener('click', () => options.onLoadCits())

  // Tabs
  const tabRefs = el.querySelector('#tab-refs') as HTMLElement | null
  const tabCits = el.querySelector('#tab-cits') as HTMLElement | null
  tabRefs?.addEventListener('click', () => options.onSetTab('refs'))
  tabCits?.addEventListener('click', () => options.onSetTab('cits'))

  // Sort headers
  const thTitle = el.querySelector('#th-title')
  const thYear = el.querySelector('#th-year')
  const thCites = el.querySelector('#th-cites')
  thTitle?.addEventListener('click', () => options.onSetSort('title'))
  thYear?.addEventListener('click', () => options.onSetSort('year'))
  thCites?.addEventListener('click', () => options.onSetSort('citations'))

  const refSpin = el.querySelector('#ref-spin') as HTMLElement | null
  const refStatus = el.querySelector('#ref-status') as HTMLElement | null
  const refTableBody = el.querySelector('#ref-table-body') as HTMLElement | null

  // Ensure panning/zooming over the panel doesn't move the graph
  const mousedownHandler = (e: Event) => e.stopPropagation()
  const wheelHandler = (e: Event) => e.stopPropagation()
  el.addEventListener('mousedown', mousedownHandler)
  el.addEventListener('wheel', wheelHandler, { passive: false })

  let currentSortKey = 'citations'
  let currentSortDesc = true
  let currentActiveTab: 'refs' | 'cits' = 'refs'

  return {
    showPaper(p: Paper) {
      el.style.display = 'block'
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
    hide() {
      el.style.display = 'none'
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
            class: 'ref-row',
            style: {
              borderBottom: '0.5px solid #f8fafc',
              cursor: 'pointer',
              background: inGraph ? '#f0f9ff' : 'transparent',
            },
            onClick: () => options.onRowClick(w),
          },
          $(
             'td',
            {
              style: {
                padding: '8px 14px',
                color: '#1e293b',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              },
              title: w.title,
            },
            w.title,
          ),
           $(
            'td',
            {
              style: {
                padding: '8px 4px',
                color: '#64748b',
              },
            },
            String(getMinDate(w) || w.publication_year || '?'),
          ),
           $(
            'td',
            {
              style: {
                padding: '8px 14px',
                color: '#6366f1',
                textAlign: 'right',
              },
            },
            fmt(w.cited_by_count || 0),
          ),
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
