import { sid } from './utils'

export const OPENALEX_API = 'https://api.openalex.org'

export async function fetchReferencedWorkIds(paperId: string): Promise<string[]> {
  const url = new URL(`/works/${sid(paperId)}`, OPENALEX_API)
  url.searchParams.set('select', 'id,referenced_works')
  const r = await fetch(url)
  const d = await r.json()
  return d.referenced_works || []
}

export async function fetchWorksByIds(ids: string[], limit?: number) {
  if (!ids || ids.length === 0) return []
  const url = new URL('/works', OPENALEX_API)
  const targetIds = limit ? ids.slice(0, limit) : ids
  url.searchParams.set('filter', 'openalex_id:' + targetIds.map(sid).join('|'))
  url.searchParams.set('per_page', '50')
  url.searchParams.set(
    'select',
    'id,title,publication_year,publication_date,created_date,cited_by_count,authorships,doi,referenced_works,locations,primary_location',
  )
  const r = await fetch(url)
  const d = await r.json()
  return d.results || []
}

export async function fetchWorksByDOIs(dois: string[]) {
  if (!dois || dois.length === 0) return []
  const results: any[] = []
  // Chunk DOIs into groups of 50 to respect API limits
  for (let i = 0; i < dois.length; i += 50) {
    const chunk = dois.slice(i, i + 50)
    const url = new URL('/works', OPENALEX_API)
    url.searchParams.set('filter', 'doi:' + chunk.join('|'))
    url.searchParams.set('per_page', '50')
    url.searchParams.set(
      'select',
      'id,title,publication_year,publication_date,created_date,cited_by_count,authorships,doi,referenced_works,locations,primary_location',
    )
    const r = await fetch(url)
    const d = await r.json()
    if (d.results) results.push(...d.results)
  }
  return results
}

export async function fetchCitingWorks(paperId: string) {
  const url = new URL('/works', OPENALEX_API)
  url.searchParams.set('filter', `cites:${sid(paperId)}`)
  url.searchParams.set('per_page', '50')
  url.searchParams.set('sort', 'cited_by_count:desc')
  url.searchParams.set(
    'select',
    'id,title,publication_year,publication_date,created_date,cited_by_count,authorships,doi,referenced_works,locations,primary_location',
  )
  const r = await fetch(url)
  const d = await r.json()
  return d.results || []
}

export async function searchWorks(query: string) {
  const url = new URL('/works', OPENALEX_API)
  url.searchParams.set('search', query)
  url.searchParams.set('per_page', '8')
  url.searchParams.set(
    'select',
    'id,title,publication_year,publication_date,created_date,cited_by_count,authorships,doi,referenced_works,locations,primary_location',
  )
  const r = await fetch(url)
  const d = await r.json()
  return d.results || []
}

export async function searchDOIByTitleSS(title: string): Promise<string | null> {
  const url = new URL('https://api.semanticscholar.org/graph/v1/paper/search')
  url.searchParams.set('query', title)
  url.searchParams.set('fields', 'externalIds')
  url.searchParams.set('limit', '1')

  const MAX_ATTEMPTS = 4
  const MAX_BACKOFF_MS = 4000

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const apiKey = localStorage.getItem('ss_api_key')
      const headers: Record<string, string> = {}
      if (apiKey) {
        headers['x-api-key'] = apiKey
      }

      const r = await fetch(url, { headers })
      
      if (r.ok) {
        const d = await r.json()
        if (d.data && d.data.length > 0 && d.data[0].externalIds?.DOI) {
          return d.data[0].externalIds.DOI
        }
        return null
      }
      
      const retryable = r.status === 429 || r.status === 503
      if (!retryable || attempt === MAX_ATTEMPTS - 1) {
        break
      }
      
      const retryAfterStr = r.headers.get('retry-after')
      let retryAfterMs = null
      if (retryAfterStr) {
        const seconds = Number(retryAfterStr)
        if (Number.isFinite(seconds) && seconds >= 0) {
          retryAfterMs = Math.min(seconds * 1000, MAX_BACKOFF_MS)
        }
      }
      const backoff = retryAfterMs ?? Math.min(1000 * Math.pow(2, attempt), MAX_BACKOFF_MS)
      await new Promise(resolve => setTimeout(resolve, backoff))
    } catch (e) {
      // In browser, rate limits (429) might come without CORS headers, throwing TypeError
      if (attempt < MAX_ATTEMPTS - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
      } else {
        console.error('Semantic Scholar API error:', e)
      }
    }
  }
  return null
}

export async function searchDOIByTitleOA(title: string): Promise<string | null> {
  const url = new URL('/works', OPENALEX_API)
  url.searchParams.set('filter', `title.search:${title}`)
  url.searchParams.set('per_page', '1')
  url.searchParams.set('select', 'doi')
  try {
    const r = await fetch(url)
    if (r.ok) {
      const d = await r.json()
      if (d.results && d.results.length > 0 && d.results[0].doi) {
        return d.results[0].doi
      }
    }
  } catch (e) {
    console.error('OpenAlex API error:', e)
  }
  return null
}
