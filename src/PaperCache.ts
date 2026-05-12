import { sid } from './utils'

const PREFIX = 'paper-openalex-'

export const PaperCache = {
  // Store a single paper's metadata in the flat cache
  setPaper(w: any) {
    if (!w || !w.id) return
    const key = `${PREFIX}${sid(w.id)}`
    try {
      sessionStorage.setItem(key, JSON.stringify(w))
    } catch (e) {
      console.warn(`[PaperCache] Failed to cache paper ${w.id}`, e)
    }
  },

  // Retrieve a single paper's metadata from the flat cache
  getPaper(id: string): any | null {
    const key = `${PREFIX}${sid(id)}`
    const saved = sessionStorage.getItem(key)
    if (!saved) return null
    try {
      return JSON.parse(saved)
    } catch (e) {
      console.error(`[PaperCache] Failed to parse cached paper ${id}`, e)
      return null
    }
  },

  getCachedMetadata(id: string): { refs: any[]; cits: any[] } | null {
    const sId = sid(id)
    const refsKey = `${PREFIX}refs-${sId}`
    const citsKey = `${PREFIX}cits-${sId}`

    const savedRefs = sessionStorage.getItem(refsKey)
    const savedCits = sessionStorage.getItem(citsKey)

    if (!savedRefs || !savedCits) {
      console.log(`[PaperCache] Cache miss for ${id}`)
      return null
    }

    try {
      const refIds: string[] = JSON.parse(savedRefs)
      const citIds: string[] = JSON.parse(savedCits)

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
    const refsKey = `${PREFIX}refs-${sId}`
    const citsKey = `${PREFIX}cits-${sId}`

    try {
      console.log(
        `[PaperCache] Fragmenting and caching metadata for ${id} (${refs.length} refs, ${cits.length} cits)`,
      )

      // Store individual papers in the flat cache
      refs.forEach(w => this.setPaper(w))
      cits.forEach(w => this.setPaper(w))

      // Store only the ID lists for the relationships
      sessionStorage.setItem(refsKey, JSON.stringify(refs.map(w => w.id)))
      sessionStorage.setItem(citsKey, JSON.stringify(cits.map(w => w.id)))
    } catch (e) {
      console.warn(`[PaperCache] Failed to cache fragmented metadata for ${id}`, e)
    }
  },

  clear() {
    console.info('[PaperCache] Clearing all cached paper metadata')
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith(PREFIX)) {
        sessionStorage.removeItem(key)
      }
    })
  },
}

// debug global access to sessionStorage
;(window as any).PaperCache = PaperCache
