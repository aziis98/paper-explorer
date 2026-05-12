import type { Paper, Connection } from './types'
import { getColor, getAuthors, getArXivUrl, getPdfUrl, getMinDate, getMinYear, formatDate } from './utils'
import { fetchReferencedWorkIds, fetchWorksByIds, fetchCitingWorks, searchWorks } from './api'

import { Graph } from './components/Graph'
import { Tooltip } from './components/Tooltip'
import { LeftPanel } from './components/LeftPanel'
import { RightPanel } from './components/RightPanel'
import { SearchPanel } from './components/SearchPanel'
import { state } from './store'
import { PaperCache } from './PaperCache'

// Global State managed in store.ts

// Dom Elements
const graphEl = document.getElementById('chart-svg') as unknown as SVGSVGElement
const tooltipEl = document.getElementById('tooltip') as HTMLElement
const leftPanelEl = document.getElementById('left-panel') as HTMLElement
const rightPanelEl = document.getElementById('right-panel') as HTMLElement
const searchPanelEl = document.getElementById('search-panel') as HTMLElement

// Component Instantiation
const tooltip = Tooltip(tooltipEl)

const graph = Graph(graphEl, {
  onPaperClick: (paper) => {
    state.selectedId = paper.id
    updateAll()
    openInfoPanel(paper)
  },
  onHover: (paper, ev) => {
    state.hoveredId = paper.id
    tooltip.show(paper, ev)
    graph.update(state.papers, state.connections, state.selectedId, state.hoveredId)
  },
  onHoverLeave: () => {
    state.hoveredId = null
    tooltip.hide()
    graph.update(state.papers, state.connections, state.selectedId, state.hoveredId)
  },
})

const leftPanel = LeftPanel(leftPanelEl, {
  onPaperClick: paper => {
    if (paper.isRef) {
      paper.isRef = false
    }
    state.selectedId = paper.id
    updateAll()
    openInfoPanel(paper)
  },
  onRemovePaper: id => {
    state.papers = state.papers.filter(p => p.id !== id && p.parentId !== id)
    state.connections = state.connections.filter(c => c.fromId !== id && c.toId !== id)
    if (state.selectedId === id) {
      rightPanel.hide()
      state.selectedId = null
    }
    updateAll()
  },
})

const rightPanel = RightPanel(rightPanelEl, {
  onClose: () => {
    rightPanel.hide()
    state.selectedId = null
    updateAll()
  },
  onRowClick: w => {
    let p = state.papers.find(pp => pp.id === w.id)
    if (!p) {
      const parent = state.papers.find(pp => pp.id === state.selectedId)
      p = {
        id: w.id,
        title: w.title,
        year: getMinYear(w),
        date: getMinDate(w),
        pubDate: formatDate(w.publication_date),
        createdDate: formatDate(w.created_date),
        citations: w.cited_by_count,
        authors: getAuthors(w),
        color: parent?.color || '#6366f1',
        doi: w.doi,
        arxivUrl: getArXivUrl(w),
        pdfUrl: getPdfUrl(w),
        isRef: true,
        parentId: state.selectedId,
        refsLoaded: false,
        referencedWorks: null,
      }
      state.papers.push(p)
      if (state.selectedId) {
        if (w.type === 'ref') {
          state.connections.push({ fromId: state.selectedId, toId: w.id })
        } else {
          state.connections.push({ fromId: w.id, toId: state.selectedId })
        }
      }
      updateAll()
    }
    state.selectedId = p.id
    updateAll()
    openInfoPanel(p)
  },
  onSetTab: tab => {
    state.activeTab = tab
    updateRightPanelData()
  },
  onSetSort: key => {
    if (state.sortKey === key) state.sortDesc = !state.sortDesc
    else {
      state.sortKey = key
      state.sortDesc = true
    }
    updateRightPanelData()
  },
  onLoadRefs: async limit => {
    const p = state.papers.find(pp => pp.id === state.selectedId)
    if (p) await loadRefsForPaper(p, limit)
  },
  onLoadCits: async limit => {
    const p = state.papers.find(pp => pp.id === state.selectedId)
    if (p) await loadCitationsForPaper(p, limit)
  },
})

const searchPanel = SearchPanel(searchPanelEl, {
  onSearch: async query => {
    searchPanel.setLoading(true)
    try {
      state.lastSearchResults = await searchWorks(query)
      searchPanel.showResults(state.lastSearchResults, new Set(state.papers.map(p => p.id)))
    } catch {
      // Ignore API errors for search
    } finally {
      searchPanel.setLoading(false)
    }
  },
  onAddResult: w => {
    if (state.papers.find(p => p.id === w.id)) return
    const idx = state.papers.filter(p => !p.isRef).length
    state.papers.push({
      id: w.id,
      title: w.title || 'Untitled',
      year: getMinYear(w),
      date: getMinDate(w),
      pubDate: formatDate(w.publication_date),
      createdDate: formatDate(w.created_date),
      citations: w.cited_by_count || 0,
      authors: getAuthors(w),
      color: getColor(idx),
      doi: w.doi,
      arxivUrl: getArXivUrl(w),
      pdfUrl: getPdfUrl(w),
      isRef: false,
      parentId: null,
      refsLoaded: false,
      referencedWorks: w.referenced_works || null,
    })
    updateAll()
    searchPanel.showResults(state.lastSearchResults, new Set(state.papers.map(p => p.id)))
  },
})

// Orchestration Logic
function updateAll() {
  graph.update(state.papers, state.connections, state.selectedId, state.hoveredId)
  leftPanel.update(state.papers, state.selectedId)
}

function updateRightPanelData() {
  rightPanel.updateTabsAndSort(state.activeTab, state.sortKey, state.sortDesc)
  rightPanel.renderTable(
    state.currentRefs,
    state.currentCits,
    new Set(state.papers.map(p => p.id)),
  )
}

function openInfoPanel(p: Paper) {
  rightPanel.showPaper(p)
  
  const cached = PaperCache.getCachedMetadata(p.id)
  if (cached) {
    state.currentRefs = cached.refs
    state.currentCits = cached.cits
    p.metadataLoaded = true
  } else {
    state.currentRefs = []
    state.currentCits = []
  }

  updateRightPanelData()
  if (!p.metadataLoaded) {
    loadMetadata(p)
  }
}

async function loadMetadata(p: Paper) {
  rightPanel.setStatus('Loading metadata...', true)

  try {
    let refIds = p.referencedWorks
    if (!refIds) {
      refIds = await fetchReferencedWorkIds(p.id)
      p.referencedWorks = refIds
    }

    const refQuery = fetchWorksByIds(refIds, 50)
    const citQuery = fetchCitingWorks(p.id)

    const [refs, cits] = await Promise.all([refQuery, citQuery])

    state.currentRefs = refs.map((w: any) => ({ ...w, type: 'ref' }))
    state.currentCits = cits.map((w: any) => ({ ...w, type: 'cit' }))
    PaperCache.setCachedMetadata(p.id, state.currentRefs, state.currentCits)

    rightPanel.setStatus(`Found ${refs.length} refs & ${cits.length} citations.`, false)
    p.metadataLoaded = true
    updateRightPanelData()
  } catch (e) {
    console.error(e)
    rightPanel.setStatus('Error loading metadata.', false)
  }
}

async function loadRefsForPaper(paper: Paper, limit?: number) {
  rightPanel.setStatus('Expanding references...', true)

  try {
    let refIds = paper.referencedWorks
    if (!refIds) {
      refIds = await fetchReferencedWorkIds(paper.id)
      paper.referencedWorks = refIds
    }

    if (!refIds || !refIds.length) {
      rightPanel.setStatus('No references found.', false)
      paper.refsLoaded = true
      return
    }

    const existSet = new Set(state.papers.map(p => p.id))
    let toFetch = refIds.filter(id => !existSet.has(id))
    const alreadyThere = refIds.filter(id => existSet.has(id))

    if (toFetch.length) {
      const results = await fetchWorksByIds(toFetch, limit)
      results.forEach((w: any) => {
        if (!w.publication_year || state.papers.some(px => px.id === w.id)) return
        state.papers.push({
          id: w.id,
          title: w.title || 'Untitled',
          year: getMinYear(w),
          date: getMinDate(w),
          pubDate: formatDate(w.publication_date),
          createdDate: formatDate(w.created_date),
          citations: w.cited_by_count || 0,
          authors: getAuthors(w),
          color: paper.color,
          doi: w.doi,
          arxivUrl: getArXivUrl(w),
        pdfUrl: getPdfUrl(w),
          isRef: true,
          parentId: paper.id,
          refsLoaded: false,
          referencedWorks: null,
        })
      })

      const addedIds = new Set(results.map((r: any) => r.id))
      toFetch = toFetch.filter(id => addedIds.has(id))
    }

    ;[...toFetch, ...alreadyThere].forEach(cid => {
      if (!state.connections.some(c => c.fromId === paper.id && c.toId === cid)) {
        state.connections.push({ fromId: paper.id, toId: cid })
      }
    })

    paper.refsLoaded = true
    updateAll()
    rightPanel.setStatus('', false)
  } catch (e) {
    console.error(e)
    rightPanel.setStatus('Error loading references.', false)
  }
}

async function loadCitationsForPaper(paper: Paper, limit?: number) {
  rightPanel.setStatus('Expanding citations...', true)

  try {
    // Re-use fetchCitingWorks, which loads up to 50 defaults
    let results = await fetchCitingWorks(paper.id)
    if (limit) results = results.slice(0, limit)

    results.forEach((w: any) => {
      if (!w.publication_year || state.papers.some(px => px.id === w.id)) return
      state.papers.push({
        id: w.id,
        title: w.title || 'Untitled',
        year: getMinYear(w),
        date: getMinDate(w),
        pubDate: formatDate(w.publication_date),
        createdDate: formatDate(w.created_date),
        citations: w.cited_by_count || 0,
        authors: getAuthors(w),
        color: paper.color,
        doi: w.doi,
        arxivUrl: getArXivUrl(w),
        pdfUrl: getPdfUrl(w),
        isRef: true,
        parentId: paper.id,
        refsLoaded: false,
        referencedWorks: null,
      })
    })

    results.forEach((w: any) => {
      if (!state.connections.some(c => c.fromId === w.id && c.toId === paper.id)) {
        state.connections.push({ fromId: w.id, toId: paper.id })
      }
    })

    updateAll()
    rightPanel.setStatus('', false)
  } catch (e) {
    console.error(e)
    rightPanel.setStatus('Error loading citations.', false)
  }
}

// Initial draw wrapper
updateAll()
