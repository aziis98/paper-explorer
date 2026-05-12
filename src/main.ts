import type { Paper, Connection } from './types'
import { getColor, getAuthors, getArXivUrl, getPdfUrl, getMinDate, getMinYear, formatDate, sid, $ } from './utils'
import { fetchReferencedWorkIds, fetchWorksByIds, fetchCitingWorks, searchWorks } from './api'

import { Graph } from './components/Graph'
import { Tooltip } from './components/Tooltip'
import { LeftPanel } from './components/LeftPanel'
import { RightPanel } from './components/RightPanel'
import { SearchPanel } from './components/SearchPanel'
import { state } from './store'
import { PaperCache } from './PaperCache'

// Global State managed in store.ts

// Dom Elements Construction
const app = document.getElementById('app') as HTMLElement

function createNavToggle(icon: string, target: HTMLElement, defaultCollapsed: boolean = false) {
  const btn = $('button', { 
    className: `nav-btn ${defaultCollapsed ? '' : 'active'}`,
    title: 'Toggle Sidebar'
  }, $('iconify-icon', { icon }))
  
  if (defaultCollapsed) target.classList.add('collapsed')
  
  btn.onclick = () => {
    target.classList.toggle('collapsed')
    btn.classList.toggle('active', !target.classList.contains('collapsed'))
  }
  return btn
}

const leftPanelEl = $('div', { className: 'sidebar left-2', id: 'left-panel' })
const rightPanelEl = $('div', { className: 'sidebar right collapsed', id: 'right-panel' })
const mainEl = $('main')

const chartContainer = $('div', { id: 'chart-container' })
const graphEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement
graphEl.id = 'chart-svg'
chartContainer.appendChild(graphEl)

const searchPanelEl = $('div', { id: 'search-container' })

mainEl.append(searchPanelEl, chartContainer)

const workspaceEl = $('div', { id: 'workspace' }, leftPanelEl, mainEl, rightPanelEl)

const navProjects = $('div', { className: 'nav-projects' }, 
  $('iconify-icon', { icon: 'mdi:folder-outline' }),
  $('span', {}, 'My Research Project'),
  $('iconify-icon', { icon: 'mdi:chevron-down' })
)

const navLeftToggle = createNavToggle('mdi:format-list-bulleted', leftPanelEl)
const navRightToggle = createNavToggle('mdi:information-outline', rightPanelEl, true)

const navbarEl = $('div', { id: 'navbar' },
  $('div', { style: 'display: flex; gap: 8px; align-items: center' },
    navLeftToggle,
    navProjects
  ),
  $('div', { style: 'display: flex; gap: 8px; align-items: center' },
    navRightToggle
  )
)

app.innerHTML = ''
app.append(navbarEl, workspaceEl)

const tooltipEl = $('div', { id: 'tooltip' })
document.body.appendChild(tooltipEl)

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
      rightPanelEl.classList.add('collapsed')
      navRightToggle.classList.remove('active')
      state.selectedId = null
    }
    updateAll()
  }
})

const rightPanel = RightPanel(rightPanelEl, {
  onClose: () => {
    rightPanelEl.classList.add('collapsed')
    state.selectedId = null
    navRightToggle.classList.remove('active')
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
        referencedWorks: w.referenced_works || null,
      }
      state.papers.push(p)
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
  }
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
function syncAllConnections() {
  const paperIds = new Set(state.papers.map(p => sid(p.id)))
  state.papers.forEach(p1 => {
    if (p1.referencedWorks) {
      p1.referencedWorks.forEach(refId => {
        const sRefId = sid(refId)
        if (paperIds.has(sRefId)) {
          const p2 = state.papers.find(p => sid(p.id) === sRefId)
          if (p2) {
            const sP1Id = sid(p1.id)
            if (!state.connections.some(c => sid(c.fromId) === sP1Id && sid(c.toId) === sRefId)) {
              state.connections.push({ fromId: p1.id, toId: p2.id })
            }
          }
        }
      })
    }
  })
}

function updateAll() {
  syncAllConnections()
  graph.update(state.papers, state.connections, state.selectedId, state.hoveredId)
  leftPanel.update(state.papers, state.selectedId)
  updateRightPanelData()
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
  rightPanelEl.classList.remove('collapsed')
  navRightToggle.classList.add('active')
  
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

    // Ensure all papers fetched have their referencedWorks tracked if available
    refs.concat(cits).forEach((w: any) => {
      const paper = state.papers.find(pp => pp.id === w.id)
      if (paper && w.referenced_works) {
        paper.referencedWorks = w.referenced_works
      }
    })

    rightPanel.setStatus(`Found ${refs.length} refs & ${cits.length} citations.`, false)
    p.metadataLoaded = true
    updateAll()
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
          referencedWorks: w.referenced_works || null,
        })
      })

      const addedIds = new Set(results.map((r: any) => r.id))
      toFetch = toFetch.filter(id => addedIds.has(id))
    }

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
        referencedWorks: w.referenced_works || null,
      })
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
