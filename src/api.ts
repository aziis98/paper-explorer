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
    'id,title,publication_year,publication_date,created_date,cited_by_count,authorships,doi,locations,primary_location',
  )
  const r = await fetch(url)
  const d = await r.json()
  return d.results || []
}

export async function fetchCitingWorks(paperId: string) {
  const url = new URL('/works', OPENALEX_API)
  url.searchParams.set('filter', `cites:${sid(paperId)}`)
  url.searchParams.set('per_page', '50')
  url.searchParams.set('sort', 'cited_by_count:desc')
  url.searchParams.set(
    'select',
    'id,title,publication_year,publication_date,created_date,cited_by_count,authorships,doi,locations,primary_location',
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
