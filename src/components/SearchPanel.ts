import { $, trunc, fmt, getAuthors, getMinYear } from '../utils'

export interface SearchPanelOptions {
  onSearch: (query: string) => void
  onAddResult: (result: any) => void
  onAddResultNewGraph: (result: any) => void
}

export function SearchPanel(el: HTMLElement, options: SearchPanelOptions) {
  el.innerHTML = ''
  
  const searchInput = $('input', {
    id: 'search-input',
    type: 'text',
    autocomplete: 'off',
    placeholder: 'Search papers, try "Attention is all you need"',
    style: ''
  })

  const srchSpin = $('div', { 
    id: 'srch-spin'
  }, $('iconify-icon', { icon: 'mdi:loading', class: 'spin srch-spin-icon' }))

  const resultsDropdown = $('div', {
    id: 'results-drop'
  })

  const resultsList = $('div', { id: 'results-list' })
  const noRes = $('p', { 
    id: 'no-res'
  }, 'No results found.')

  resultsDropdown.append(resultsList, noRes)
  el.append(searchInput, srchSpin, resultsDropdown)

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
            className: `search-item ${added ? 'added' : ''}`,
            onClick: () => {
              if (!added) options.onAddResult(w)
            },
          },
          $(
            'div',
            { className: 'search-item-header' },
            $(
              'p',
              { className: 'search-item-title' },
              trunc(w.title || 'Untitled', 88),
            ),
            $(
              'div',
              { className: 'search-item-actions' },
              $(
                'button',
                {
                  className: `search-item-add ${added ? 'added' : ''}`,
                  onClick: (e: Event) => {
                    e.stopPropagation() // Prevent triggering the item's main onClick
                    if (!added) options.onAddResult(w)
                  }
                },
                added ? 'Added' : '+ Add',
              ),
              $(
                'button',
                {
                  className: 'search-item-new-proj',
                  title: 'Add to new project',
                  onClick: (e: Event) => {
                    e.stopPropagation()
                    options.onAddResultNewGraph(w)
                  }
                },
                $('iconify-icon', { icon: 'mdi:folder-plus-outline', style: 'font-size: 14px' })
              )
            )
          ),
          $(
            'div',
            { className: 'search-item-meta' },
            $(
              'p',
              { className: 'search-item-authors' },
              trunc(getAuthors(w), 60),
            ),
            $(
              'p',
              { className: 'search-item-stats' },
              `${getMinYear(w) || '?'} · ${fmt(w.cited_by_count || 0)} citations`,
            ),
          ),
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
