import type { Paper, Connection } from './types'

export interface State {
  projectId: string
  projectName: string
  papers: Paper[]
  connections: Connection[]
  selectedId: string | null
  hoveredId: string | null
  currentRefs: any[]
  currentCits: any[]
  activeTab: 'refs' | 'cits'
  sortKey: string
  sortDesc: boolean
  lastSearchResults: any[]
  dijkstraMode: boolean
}

export interface ProjectIndexEntry {
  id: string
  name: string
  lastModified: number
}

const generateId = () => Math.random().toString(36).substr(2, 9)

export const state: State = {
  projectId: 'default',
  projectName: 'My Research Project',
  papers: [],
  connections: [],
  selectedId: null,
  hoveredId: null,
  currentRefs: [],
  currentCits: [],
  activeTab: 'refs',
  sortKey: 'citations',
  sortDesc: true,
  lastSearchResults: [],
  dijkstraMode: false,
}

export const StoreManager = {
  getProjectsIndex(): ProjectIndexEntry[] {
    const raw = localStorage.getItem('paper-explorer-projects')
    if (raw) {
      try {
        return JSON.parse(raw)
      } catch (e) {}
    }
    return []
  },

  saveProjectsIndex(index: ProjectIndexEntry[]) {
    localStorage.setItem('paper-explorer-projects', JSON.stringify(index))
  },

  saveCurrentProject() {
    const projectData = {
      id: state.projectId,
      name: state.projectName,
      papers: state.papers,
      connections: state.connections,
    }
    localStorage.setItem(`paper-explorer-project-${state.projectId}`, JSON.stringify(projectData))
    localStorage.setItem('paper-explorer-last-project', state.projectId)

    const index = this.getProjectsIndex()
    const existing = index.find(p => p.id === state.projectId)
    if (existing) {
      existing.name = state.projectName
      existing.lastModified = Date.now()
    } else {
      index.push({
        id: state.projectId,
        name: state.projectName,
        lastModified: Date.now(),
      })
    }
    this.saveProjectsIndex(index)
  },

  loadProject(id: string) {
    const raw = localStorage.getItem(`paper-explorer-project-${id}`)
    if (raw) {
      try {
        const data = JSON.parse(raw)
        state.projectId = data.id || id
        state.projectName = data.name || 'Untitled Project'
        state.papers = data.papers || []
        state.connections = data.connections || []
        state.selectedId = null
        state.hoveredId = null
        state.currentRefs = []
        state.currentCits = []
        this.saveCurrentProject() // Updates the last-project key
        return true
      } catch (e) {
        console.error('Failed to load project', e)
      }
    }
    return false
  },

  deleteProject(id: string) {
    localStorage.removeItem(`paper-explorer-project-${id}`)
    const index = this.getProjectsIndex().filter(p => p.id !== id)
    this.saveProjectsIndex(index)
    if (state.projectId === id) {
      localStorage.removeItem('paper-explorer-last-project')
      this.loadState()
    }
  },

  createNewProject(name: string = 'New Project'): string {
    const id = generateId()
    state.projectId = id
    state.projectName = name
    state.papers = []
    state.connections = []
    state.selectedId = null
    state.hoveredId = null
    state.currentRefs = []
    state.currentCits = []
    this.saveCurrentProject()
    return id
  },

  loadState() {
    const lastProjectId = localStorage.getItem('paper-explorer-last-project')
    if (lastProjectId) {
      const success = this.loadProject(lastProjectId)
      if (success) return
    }

    // Fallback: create a default project if nothing exists
    const index = this.getProjectsIndex()
    if (index.length > 0) {
      // Sort by last modified descending
      index.sort((a, b) => b.lastModified - a.lastModified)
      this.loadProject(index[0].id)
    } else {
      this.createNewProject('My Research Project')
    }
  }
}

// debug global access to state
;(window as any).state = state
