export const fmt = (n: number) =>
  n >= 1e6
    ? (n / 1e6).toFixed(1) + 'M'
    : n >= 1e3
      ? (n / 1e3).toFixed(1) + 'K'
      : n.toLocaleString()

export const trunc = (s: string | null | undefined, n: number) =>
  s && s.length > n
    ? s.slice(0, n) + '...'
    : s || 'Untitled'

export const sid = (id: string) =>
  id.replace('https://openalex.org/', '')


export function getAuthors(w: any) {
  if (!w.authorships?.length) return 'Unknown authors'
  const n = w.authorships.slice(0, 3).map((a: any) => {
    const p = (a.author?.display_name || '')
      .trim()
      .split(' ')
    return p.length > 1 ? p[p.length - 1] : p[0] || ''
  })
  if (w.authorships.length > 3) n.push('et al.')
  return n.join(', ')
}

export function getArXivUrl(w: any) {
  if (!w.locations) return null
  const loc = w.locations.find(
    (l: any) =>
      l.source?.id === 'https://openalex.org/S4306400194' ||
      l.source?.display_name
        ?.toLowerCase()
        .includes('arxiv'),
  )
  return loc?.landing_page_url || null
}

export function getPdfUrl(w: any) {
  return w.primary_location?.pdf_url || null
}

export function formatDate(d: string | null | undefined) {
  return d ? d.substring(0, 10) : null
}

export function getMinDate(w: any) {
  const dates = [formatDate(w.publication_date), formatDate(w.created_date)].filter(Boolean)
  if (!dates.length) return null
  return dates.sort()[0]
}

export function getMinYear(w: any) {
  const d = getMinDate(w)
  return d ? parseInt(d.substring(0, 4), 10) : (w.publication_year || null)
}

export function $(
  tag: string,
  props: any = {},
  ...children: (
    | Node
    | string
    | null
    | undefined
    | boolean
  )[]
) {
  const el = document.createElement(tag)
  Object.entries(props).forEach(([key, val]) => {
    if (key.startsWith('on') && typeof val === 'function') {
      const eventName = key.slice(2).toLowerCase()
      el.addEventListener(eventName, val as any)
    } else if (key === 'style' && typeof val === 'object') {
      Object.assign(el.style, val)
    } else if (key === 'className' || key === 'class') {
      el.className = val as string
    } else {
      ;(el as any)[key] = val
    }
  })
  children.flat().forEach(c => {
    if (c === null || c === undefined || c === false) return
    if (typeof c === 'string' || typeof c === 'number') {
      el.appendChild(document.createTextNode(String(c)))
    } else {
      el.appendChild(c as Node)
    }
  })
  return el
}

export function generateBibtex(papers: import('./types').Paper[]): string {
  return papers.map(p => {
    const firstAuthor = p.authors.split(',')[0].replace(/[^a-zA-Z]/g, '') || 'Unknown'
    const year = p.year || 'UnknownYear'
    const idStr = `${firstAuthor}${year}` + p.id.split('/').pop()

    const authorField = p.authors.includes('et al.') 
      ? p.authors.replace(', et al.', ' and others') 
      : p.authors.split(', ').join(' and ')

    let bib = `@article{${idStr},\n`
    bib += `  title = {${p.title}},\n`
    bib += `  author = {${authorField}},\n`
    if (p.year) bib += `  year = {${p.year}},\n`
    if (p.doi) bib += `  doi = {${p.doi.replace('https://doi.org/', '')}},\n`
    if (p.id) bib += `  url = {${p.id}}\n`
    bib += `}\n`

    return bib
  }).join('\n')
}

export function downloadBlob(content: string, filename: string, contentType: string) {
  const blob = new Blob([content], { type: contentType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function extractDOIs(text: string): string[] {
  // Matches DOIs starting with 10. (e.g. 10.1038/s41586-020-2649-2)
  const regex = /10\.\d{4,9}\/[-._;()/:A-Z0-9]+/gi
  const matches = text.match(regex) || []
  
  // Remove trailing punctuation that might be caught (like period or comma at the end of a sentence)
  const cleaned = matches.map(doi => doi.replace(/[.,;:]$/, ''))
  
  // Return unique DOIs in lowercase
  return [...new Set(cleaned.map(doi => doi.toLowerCase()))]
}

export function extractBibtexTitles(text: string): string[] {
  const regex = /\btitle\s*=\s*(?:\{([^}]*)\}|"([^"]*)")/gi
  let match;
  const titles: string[] = []
  while ((match = regex.exec(text)) !== null) {
    const title = match[1] || match[2]
    if (title) {
      titles.push(title.replace(/\s+/g, ' ').replace(/[{}]/g, '').trim())
    }
  }
  return [...new Set(titles)]
}
