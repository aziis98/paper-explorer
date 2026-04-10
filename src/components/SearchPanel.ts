import { $, trunc, fmt, getAuthors, getMinYear } from '../utils'

export interface SearchPanelOptions {
  onSearch: (query: string) => void
  onAddResult: (result: any) => void
}

export function SearchPanel(el: HTMLElement, options: SearchPanelOptions) {
  const searchInput = el.querySelector('#search-input') as HTMLInputElement | null
  const resultsDropdown = el.querySelector('#results-drop') as HTMLElement | null
  const resultsList = el.querySelector('#results-list') as HTMLElement | null
  const noRes = el.querySelector('#no-res') as HTMLElement | null
  const srchSpin = el.querySelector('#srch-spin') as HTMLElement | null

  let searchTimer: any

  const inputHandler = (e: Event) => {
    clearTimeout(searchTimer)
    const q = (e.target as HTMLInputElement).value.trim()
    if (!q) {
      if (resultsDropdown) resultsDropdown.style.display = 'none'
      if (srchSpin) srchSpin.style.display = 'none'
      return
    }
    searchTimer = setTimeout(() => options.onSearch(q), 380)
  }

  const keydownHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (resultsDropdown) resultsDropdown.style.display = 'none'
    }
  }

  const documentClickHandler = (e: MouseEvent) => {
    if (el && !el.contains(e.target as Node)) {
       if (searchInput) searchInput.value = ''
       if (resultsDropdown) resultsDropdown.style.display = 'none'
    }
  }

  const mousedownHandler = (e: Event) => e.stopPropagation()
  const wheelHandler = (e: Event) => e.stopPropagation()

  if (searchInput) {
    searchInput.addEventListener('input', inputHandler)
    searchInput.addEventListener('keydown', keydownHandler)
  }
  document.addEventListener('click', documentClickHandler)

  el.addEventListener('mousedown', mousedownHandler)
  el.addEventListener('wheel', wheelHandler, { passive: false })

  return {
    setLoading(loading: boolean) {
      if (srchSpin) srchSpin.style.display = loading ? 'inline-block' : 'none'
    },
    showResults(results: any[], currentPapersModel: Set<string>) {
      if (resultsDropdown) resultsDropdown.style.display = 'block'
      if (!resultsList || !noRes) return
      resultsList.innerHTML = ''

      if (!results.length) {
        noRes.style.display = 'block'
        return
      }

      noRes.style.display = 'none'

      results.forEach(w => {
        const added = currentPapersModel.has(w.id)
        const item = $(
          'div',
          {
            class: 'ri',
            style: {
              opacity: added ? '0.55' : '1',
              padding: '12px 14px',
              borderBottom: '0.5px solid #f1f5f9',
              cursor: 'pointer',
            },
            onMouseEnter: (e: MouseEvent) => {
              ;(e.currentTarget as HTMLElement).style.background = '#f8fafc'
            },
            onMouseLeave: (e: MouseEvent) => {
              ;(e.currentTarget as HTMLElement).style.background = 'transparent'
            },
            onClick: () => {
              if (!added) options.onAddResult(w)
            },
          },
          $(
            'div',
            {
               style: {
                 display: 'flex',
                 alignItems: 'flex-start',
                 justifyContent: 'space-between',
                 gap: '8px',
               },
            },
            $(
              'p',
              {
                style: {
                  fontSize: '12px',
                  fontWeight: '500',
                  color: '#1e293b',
                  lineHeight: '1.4',
                  flex: '1',
                },
              },
              trunc(w.title || 'Untitled', 88),
            ),
             $(
              'span',
              {
                style: {
                  fontSize: '11px',
                  fontWeight: '600',
                  color: added ? '#94a3b8' : '#6366f1',
                  flexShrink: '0',
                },
              },
              added ? 'Added' : '+ Add',
            ),
          ),
          $(
            'p',
            {
              style: {
                 fontSize: '10px',
                 color: '#94a3b8',
                 marginTop: '3px',
              },
            },
            `${getAuthors(w)} · ${getMinYear(w) || '?'} · ↑ ${fmt(w.cited_by_count || 0)}`
          )
        )
        resultsList.appendChild(item)
      })
    },
    hideResults() {
      if (resultsDropdown) resultsDropdown.style.display = 'none'
    },
    unmount() {
      if (searchInput) {
        searchInput.removeEventListener('input', inputHandler)
        searchInput.removeEventListener('keydown', keydownHandler)
      }
      document.removeEventListener('click', documentClickHandler)
      el.removeEventListener('mousedown', mousedownHandler)
      el.removeEventListener('wheel', wheelHandler)
    }
  }
}
