const STORAGE_PREFIX = 'paper-metadata-'

export const PaperCache = {
  getCachedMetadata(id: string): { refs: any[], cits: any[] } | null {
    const key = STORAGE_PREFIX + id
    const saved = sessionStorage.getItem(key)
    if (!saved) {
      console.log(`[PaperCache] Cache miss for ${id}`)
      return null
    }
    try {
      const data = JSON.parse(saved)
      console.log(`[PaperCache] Cache hit for ${id} (${data.refs.length} refs, ${data.cits.length} cits)`)
      return data
    } catch (e) {
      console.error('[PaperCache] Failed to parse cached metadata for', id, e)
      return null
    }
  },

  setCachedMetadata(id: string, refs: any[], cits: any[]) {
    const key = STORAGE_PREFIX + id
    try {
      console.log(`[PaperCache] Caching metadata for ${id} (${refs.length} refs, ${cits.length} cits)`)
      sessionStorage.setItem(key, JSON.stringify({ refs, cits }))
    } catch (e) {
      // Handle quota exceeded or other errors silently but log if possible
      console.warn('[PaperCache] Failed to cache metadata for', id, e)
    }
  },

  clear() {
    console.info('[PaperCache] Clearing all cached paper metadata')
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith(STORAGE_PREFIX)) {
        sessionStorage.removeItem(key)
      }
    })
  }
}
