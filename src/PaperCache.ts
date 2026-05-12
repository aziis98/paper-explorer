import { sid } from './utils'

const CACHE_KEY = 'paper-explorer-cache'

interface CacheState {
  papers: Record<string, any>
  refs: Record<string, string[]>
  cits: Record<string, string[]>
}

let inMemoryCache: CacheState = { papers: {}, refs: {}, cits: {} }

function loadCache() {
  const saved = sessionStorage.getItem(CACHE_KEY)
  if (saved) {
    try {
      inMemoryCache = JSON.parse(saved)
      console.log(`[PaperCache] Loaded cache from session storage (${Object.keys(inMemoryCache.papers).length} papers)`)
    } catch (e) {
      console.error('[PaperCache] Failed to load cache', e)
    }
  }
}

function saveCache() {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(inMemoryCache))
  } catch (e) {
    console.warn('[PaperCache] Failed to save cache', e)
  }
}

// Load cache immediately on module initialization
loadCache()

export const PaperCache = {
  setPaper(w: any, deferSave = false) {
    if (!w || !w.id) return
    const sId = sid(w.id)
    
    // Omit referenced_works to save space, store them in refs instead
    const { referenced_works, ...rest } = w
    inMemoryCache.papers[sId] = rest
    
    if (referenced_works && Array.isArray(referenced_works)) {
      if (!inMemoryCache.refs[sId] || inMemoryCache.refs[sId].length < referenced_works.length) {
        inMemoryCache.refs[sId] = referenced_works.map(id => sid(id))
      }
    }
    
    if (!deferSave) saveCache()
  },

  getPaper(id: string): any | null {
    const sId = sid(id)
    const paper = inMemoryCache.papers[sId]
    if (!paper) return null
    
    const refs = inMemoryCache.refs[sId]
    if (refs) {
      // Reconstruct referenced_works when returning the paper
      return { ...paper, referenced_works: refs }
    }
    return paper
  },

  getCachedMetadata(id: string): { refs: any[]; cits: any[] } | null {
    const sId = sid(id)
    const refIds = inMemoryCache.refs[sId]
    const citIds = inMemoryCache.cits[sId]

    // If citIds doesn't exist, we haven't fetched citations for this paper yet
    if (!refIds || !citIds) {
      console.log(`[PaperCache] Cache miss for ${id}`)
      return null
    }

    try {
      const refs = refIds.map(rid => this.getPaper(rid)).filter(Boolean)
      const cits = citIds.map(cid => this.getPaper(cid)).filter(Boolean)

      console.log(
        `[PaperCache] Cache hit for ${id} (reconstructed ${refs.length} refs, ${cits.length} cits)`,
      )
      return { refs, cits }
    } catch (e) {
      console.error(`[PaperCache] Failed to reconstruct metadata for ${id}`, e)
      return null
    }
  },

  setCachedMetadata(id: string, refs: any[], cits: any[]) {
    const sId = sid(id)

    try {
      console.log(
        `[PaperCache] Caching metadata for ${id} (${refs.length} refs, ${cits.length} cits)`,
      )

      refs.forEach(w => this.setPaper(w, true))
      cits.forEach(w => this.setPaper(w, true))

      // Merge new reference/citation IDs with any existing ones
      inMemoryCache.refs[sId] = Array.from(new Set([
        ...(inMemoryCache.refs[sId] || []),
        ...refs.map(w => sid(w.id))
      ]))
      inMemoryCache.cits[sId] = Array.from(new Set([
        ...(inMemoryCache.cits[sId] || []),
        ...cits.map(w => sid(w.id))
      ]))

      saveCache()
    } catch (e) {
      console.warn(`[PaperCache] Failed to cache fragmented metadata for ${id}`, e)
    }
  },

  clear() {
    console.info('[PaperCache] Clearing all cached paper metadata')
    inMemoryCache = { papers: {}, refs: {}, cits: {} }
    sessionStorage.removeItem(CACHE_KEY)
  },
}

// debug global access to the cache
;(window as any).PaperCache = PaperCache
