import type { Paper } from './types'
import {
  getAuthors,
  getArXivUrl,
  getPdfUrl,
  getMinDate,
  getMinYear,
  formatDate,
  sid,
  $,
  trunc,
  generateBibtex,
  downloadBlob,
} from './utils'
import {
  fetchReferencedWorkIds,
  fetchWorksByIds,
  fetchCitingWorks,
  searchWorks,
} from './api'

import { Graph } from './components/Graph'
import { Tooltip } from './components/Tooltip'
import { LeftPanel } from './components/LeftPanel'
import { RightPanel } from './components/RightPanel'
import { SearchPanel } from './components/SearchPanel'
import { ImportModal } from './components/ImportModal'
import { state, StoreManager } from './store'
import { PaperCache } from './PaperCache'

// Global State managed in store.ts

// Dom Elements Construction
const app = document.getElementById('app') as HTMLElement



const leftPanelEl = $('div', {
  className: 'sidebar left-2',
  id: 'left-panel',
})
const rightPanelEl = $('div', {
  className: 'sidebar right collapsed',
  id: 'right-panel',
})
const mainEl = $('main')

const chartContainer = $('div', { id: 'chart-container' })
const graphEl = document.createElementNS(
  'http://www.w3.org/2000/svg',
  'svg',
) as SVGSVGElement
graphEl.id = 'chart-svg'
chartContainer.appendChild(graphEl)

const searchPanelEl = $('div', { id: 'search-container' })

mainEl.append(chartContainer)

const workspaceEl = $(
  'div',
  { id: 'workspace' },
  leftPanelEl,
  mainEl,
  rightPanelEl,
)

const projectNameInput = $('input', {
  className: 'project-name-input',
  value: state.projectName || 'My Research Project',
  onBlur: (e: Event) => {
    state.projectName = (e.target as HTMLInputElement).value
    StoreManager.saveCurrentProject()
  },
  onKeyDown: (e: KeyboardEvent) => {
    if (e.key === 'Enter')
      (e.target as HTMLInputElement).blur()
  },
})

const projectDropdownList = $('div', {
  className: 'project-dropdown',
})

function renderProjectDropdown() {
  projectDropdownList.innerHTML = ''
  const index = StoreManager.getProjectsIndex()
  index.sort((a, b) => b.lastModified - a.lastModified)

  index.forEach(p => {
    projectDropdownList.append(
      $(
        'div',
        {
          className: 'project-item',
          onClick: () => {
            StoreManager.loadProject(p.id)
            projectDropdownList.classList.remove('open')
            projectNameInput.value = state.projectName
            updateAll()
          },
        },
        $(
          'div',
          { style: 'flex: 1; min-width: 0' },
          $(
            'span',
            { className: 'project-item-name' },
            p.name,
          ),
          $(
            'span',
            { className: 'project-item-date' },
            new Date(p.lastModified).toLocaleString(),
          ),
        ),
        $(
          'button',
          {
            className: 'project-delete-btn',
            title: 'Delete Project',
            onClick: (e: MouseEvent) => {
              e.stopPropagation()
              if (
                confirm(
                  `Are you sure you want to delete "${p.name}"?`,
                )
              ) {
                StoreManager.deleteProject(p.id)
                renderProjectDropdown()
                projectNameInput.value = state.projectName
                updateAll()
              }
            },
          },
          $('iconify-icon', {
            icon: 'mdi:trash-can-outline',
          }),
        ),
      ),
    )
  })

  projectDropdownList.append(
    $(
      'div',
      {
        className: 'new-project-btn',
        onClick: () => {
          StoreManager.createNewProject()
          projectDropdownList.classList.remove('open')
          projectNameInput.value = state.projectName
          updateAll()
          projectNameInput.focus()
        },
      },
      $('iconify-icon', { icon: 'mdi:plus' }),
      'New Project',
    ),
  )
}

const navProjectsContainer = $(
  'div',
  { className: 'nav-projects-container' },
  $(
    'div',
    {
      className: 'nav-projects',
      onClick: (e: Event) => {
        // Don't toggle dropdown if clicking the input
        if (e.target === projectNameInput) return
        renderProjectDropdown()
        projectDropdownList.classList.toggle('open')
      },
    },
    $('iconify-icon', { icon: 'mdi:folder-outline' }),
    projectNameInput,
    $('iconify-icon', { icon: 'mdi:chevron-down' }),
  ),
  projectDropdownList,
)

// Close dropdown when clicking outside
function togglePanel(
  side: 'left' | 'right',
  collapsed?: boolean,
) {
  const target = side === 'left' ? leftPanelEl : rightPanelEl
  const tab = side === 'left' ? sidebarLeftTab : sidebarRightTab
  const icon = tab.querySelector('iconify-icon')

  if (collapsed !== undefined) {
    target.classList.toggle('collapsed', collapsed)
  } else {
    target.classList.toggle('collapsed')
  }

  const isCollapsed = target.classList.contains('collapsed')
  if (icon) {
    if (side === 'left') {
      icon.setAttribute(
        'icon',
        isCollapsed ? 'mdi:chevron-right' : 'mdi:chevron-left',
      )
    } else {
      icon.setAttribute(
        'icon',
        isCollapsed ? 'mdi:chevron-left' : 'mdi:chevron-right',
      )
    }
  }
}

function createSidebarTab(
  side: 'left' | 'right',
  target: HTMLElement,
) {
  const icon = $('iconify-icon', {
    icon: target.classList.contains('collapsed')
      ? side === 'left'
        ? 'mdi:chevron-right'
        : 'mdi:chevron-left'
      : side === 'left'
        ? 'mdi:chevron-left'
        : 'mdi:chevron-right',
  })
  const tab = $(
    'div',
    {
      className: `sidebar-toggle-tab ${side}`,
      title: `Toggle ${side} Panel`,
      onClick: () => togglePanel(side),
    },
    icon,
  )
  return tab
}

const sidebarLeftTab = createSidebarTab('left', leftPanelEl)
const sidebarRightTab = createSidebarTab('right', rightPanelEl)

const githubStarLink = $(
  'a',
  {
    className: 'github-star-link',
    href: 'https://github.com/aziis98/paper-explorer',
    target: '_blank',
    title: 'Star on GitHub',
  },
  $('iconify-icon', { icon: 'mdi:github' }),
  $('span', {}, 'Star on GitHub'),
  $('iconify-icon', {
    icon: 'mdi:star',
    className: 'star-icon',
  }),
)

const navGraphToggle = $(
  'button',
  {
    className: `nav-btn ${state.dijkstraMode ? 'active' : ''}`,
    title: 'Shortest Path Mode',
    onClick: () => {
      state.dijkstraMode = !state.dijkstraMode
      navGraphToggle.classList.toggle('active', state.dijkstraMode)
      updateAll()
    },
  },
  $('iconify-icon', { icon: 'mdi:graph-outline' }),
)

const navForceToggle = $(
  'button',
  {
    className: `nav-btn ${state.graphMode === 'force' ? 'active' : ''}`,
    title: 'Force-Directed Graph',
    onClick: () => {
      state.graphMode =
        state.graphMode === 'coords' ? 'force' : 'coords'
      navForceToggle.classList.toggle(
        'active',
        state.graphMode === 'force',
      )
      updateAll()
    },
  },
  $('iconify-icon', { icon: 'ph:graph' }),
)

const navbarEl = $(
  'div',
  { id: 'navbar' },
  $(
    'div',
    {
      className: 'nav-left-section',
    },
    navProjectsContainer,
    githubStarLink,
  ),
  searchPanelEl,
  $(
    'div',
    {
      className: 'nav-right-section',
    },
    navForceToggle,
    navGraphToggle,
  ),
)

mainEl.append(sidebarLeftTab, sidebarRightTab)

app.innerHTML = ''
app.append(navbarEl, workspaceEl)

const tooltipEl = $('div', { id: 'tooltip' })
document.body.appendChild(tooltipEl)

// Component Instantiation
const tooltip = Tooltip(tooltipEl)

const graph = Graph(graphEl, {
  onPaperClick: paper => {
    state.selectedId = paper.id
    updateAll()
    openInfoPanel(paper)
  },
  onHover: (paper, ev) => {
    state.hoveredId = paper.id
    tooltip.show(paper, ev)
    graph.update(
      state.papers,
      state.connections,
      state.selectedId,
      state.hoveredId,
      state.dijkstraMode,
      state.graphMode,
    )
  },
  onHoverLeave: () => {
    state.hoveredId = null
    tooltip.hide()
    graph.update(
      state.papers,
      state.connections,
      state.selectedId,
      state.hoveredId,
      state.dijkstraMode,
      state.graphMode,
    )
  },
})

const leftPanel = LeftPanel(leftPanelEl, {
  onPaperClick: paper => {
    if (paper.isSecondary) {
      paper.isSecondary = false
    }
    state.selectedId = paper.id
    updateAll()
    openInfoPanel(paper)
  },
  onRemovePaper: id => {
    state.papers = state.papers.filter(
      p => p.id !== id && p.parentId !== id,
    )
    state.connections = state.connections.filter(
      c => c.fromId !== id && c.toId !== id,
    )
    if (state.selectedId === id) {
      togglePanel('right', true)
      state.selectedId = null
    }
    updateAll()
  },
  onExport: type => {
    const toExport =
      type === 'primary'
        ? state.papers.filter(p => !p.isSecondary)
        : state.papers
    if (!toExport.length) return
    const bibtex = generateBibtex(toExport)
    downloadBlob(
      bibtex,
      `${state.projectName.toLowerCase().replace(/\s+/g, '-')}_${type}.bib`,
      'text/plain',
    )
  },
  onImport: () => {
    const modal = ImportModal({
      onImport: papers => {
        let addedCount = 0
        papers.forEach(p => {
          if (
            !state.papers.some(
              existing => existing.id === p.id,
            )
          ) {
            state.papers.push(p)
            addedCount++
          }
        })
        if (addedCount > 0) {
          updateAll()
        } else {
          alert(
            'All selected papers are already in the graph.',
          )
        }
      },
    })
    modal.show()
  },
  onMakeSecondary: id => {
    const paper = state.papers.find(p => p.id === id)
    if (paper) {
      paper.isSecondary = true
      updateAll()
    }
  },
  onRemoveAllPapers: type => {
    const isRemoveSecondary = type === 'secondary'
    const toRemove = state.papers.filter(
      p => p.isSecondary === isRemoveSecondary,
    )
    const idsToRemove = new Set(toRemove.map(p => p.id))

    state.papers = state.papers.filter(
      p => !idsToRemove.has(p.id),
    )
    state.connections = state.connections.filter(
      c =>
        !idsToRemove.has(c.fromId) &&
        !idsToRemove.has(c.toId),
    )

    if (
      state.selectedId &&
      idsToRemove.has(state.selectedId)
    ) {
      state.selectedId = null
      togglePanel('right', true)
    }
    updateAll()
  },
})

const rightPanel = RightPanel(rightPanelEl, {
  onClose: () => {
    togglePanel('right', true)
    state.selectedId = null
    updateAll()
  },
  onRowClick: w => {
    let p = state.papers.find(pp => pp.id === w.id)
    if (!p) {
      const parent = state.papers.find(
        pp => pp.id === state.selectedId,
      )
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
        isSecondary: true,
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
    if (state.sortKey === key)
      state.sortDesc = !state.sortDesc
    else {
      state.sortKey = key
      state.sortDesc = true
    }
    updateRightPanelData()
  },
  onLoadRefs: async limit => {
    const p = state.papers.find(
      pp => pp.id === state.selectedId,
    )
    if (p) await loadRefsForPaper(p, limit)
  },
  onLoadCits: async limit => {
    const p = state.papers.find(
      pp => pp.id === state.selectedId,
    )
    if (p) await loadCitationsForPaper(p, limit)
  },
})

const searchPanel = SearchPanel(searchPanelEl, {
  onSearch: async query => {
    searchPanel.setLoading(true)
    try {
      state.lastSearchResults = await searchWorks(query)
      searchPanel.showResults(
        state.lastSearchResults,
        new Set(state.papers.map(p => p.id)),
      )
    } catch {
      // Ignore API errors for search
    } finally {
      searchPanel.setLoading(false)
    }
  },
  onAddResult: w => {
    if (state.papers.find(p => p.id === w.id)) return
    state.papers.push({
      id: w.id,
      title: w.title || 'Untitled',
      year: getMinYear(w),
      date: getMinDate(w),
      pubDate: formatDate(w.publication_date),
      createdDate: formatDate(w.created_date),
      citations: w.cited_by_count || 0,
      authors: getAuthors(w),
      color: '#00d4ff',
      doi: w.doi,
      arxivUrl: getArXivUrl(w),
      pdfUrl: getPdfUrl(w),
      isSecondary: false,
      parentId: null,
      refsLoaded: false,
      referencedWorks: w.referenced_works || null,
    })
    updateAll()
    searchPanel.showResults(
      state.lastSearchResults,
      new Set(state.papers.map(p => p.id)),
    )
  },
  onAddResultNewGraph: w => {
    StoreManager.createNewProject(
      trunc(w.title || 'Untitled', 30),
    )
    projectNameInput.value = state.projectName

    state.papers.push({
      id: w.id,
      title: w.title || 'Untitled',
      year: getMinYear(w),
      date: getMinDate(w),
      pubDate: formatDate(w.publication_date),
      createdDate: formatDate(w.created_date),
      citations: w.cited_by_count || 0,
      authors: getAuthors(w),
      color: '#00d4ff',
      doi: w.doi,
      arxivUrl: getArXivUrl(w),
      pdfUrl: getPdfUrl(w),
      isSecondary: false,
      parentId: null,
      refsLoaded: false,
      referencedWorks: w.referenced_works || null,
    })
    updateAll()
    searchPanel.hideResults()
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
          const p2 = state.papers.find(
            p => sid(p.id) === sRefId,
          )
          if (p2) {
            const sP1Id = sid(p1.id)
            if (
              !state.connections.some(
                c =>
                  sid(c.fromId) === sP1Id &&
                  sid(c.toId) === sRefId,
              )
            ) {
              state.connections.push({
                fromId: p1.id,
                toId: p2.id,
              })
            }
          }
        }
      })
    }
  })
}

function updateAll() {
  syncAllConnections()
  graph.update(
    state.papers,
    state.connections,
    state.selectedId,
    state.hoveredId,
    state.dijkstraMode,
    state.graphMode,
  )
  leftPanel.update(state.papers, state.selectedId)
  updateRightPanelData()
  StoreManager.saveCurrentProject()
}

function updateRightPanelData() {
  rightPanel.updateTabsAndSort(
    state.activeTab,
    state.sortKey,
    state.sortDesc,
  )
  rightPanel.renderTable(
    state.currentRefs,
    state.currentCits,
    new Set(state.papers.map(p => p.id)),
  )
}

function openInfoPanel(p: Paper) {
  rightPanel.showPaper(p)
  togglePanel('right', false)

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

    const [refs, cits] = await Promise.all([
      refQuery,
      citQuery,
    ])

    state.currentRefs = refs.map((w: any) => ({
      ...w,
      type: 'ref',
    }))
    state.currentCits = cits.map((w: any) => ({
      ...w,
      type: 'cit',
    }))
    PaperCache.setCachedMetadata(
      p.id,
      state.currentRefs,
      state.currentCits,
    )

    // Ensure all papers fetched have their referencedWorks tracked if available
    refs.concat(cits).forEach((w: any) => {
      const paper = state.papers.find(pp => pp.id === w.id)
      if (paper && w.referenced_works) {
        paper.referencedWorks = w.referenced_works
      }
    })

    rightPanel.setStatus(
      `Found ${refs.length} refs & ${cits.length} citations.`,
      false,
    )
    p.metadataLoaded = true
    updateAll()
  } catch (e) {
    console.error(e)
    rightPanel.setStatus('Error loading metadata.', false)
  }
}

async function loadRefsForPaper(
  paper: Paper,
  limit?: number,
) {
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

    if (toFetch.length) {
      const results = await fetchWorksByIds(toFetch, limit)
      results.forEach((w: any) => {
        if (
          !w.publication_year ||
          state.papers.some(px => px.id === w.id)
        )
          return
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
          isSecondary: true,
          parentId: paper.id,
          refsLoaded: false,
          referencedWorks: w.referenced_works || null,
        })
      })

      const addedIds = new Set(
        results.map((r: any) => r.id),
      )
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

async function loadCitationsForPaper(
  paper: Paper,
  limit?: number,
) {
  rightPanel.setStatus('Expanding citations...', true)

  try {
    // Re-use fetchCitingWorks, which loads up to 50 defaults
    let results = await fetchCitingWorks(paper.id)
    if (limit) results = results.slice(0, limit)

    results.forEach((w: any) => {
      if (
        !w.publication_year ||
        state.papers.some(px => px.id === w.id)
      )
        return
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
        isSecondary: true,
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
StoreManager.loadState()
projectNameInput.value = state.projectName
updateAll()
