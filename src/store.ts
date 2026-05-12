import type { Paper, Connection } from './types'

export interface State {
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
}

export const state: State = {
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
}

// debug global access to state
;(window as any).state = state
