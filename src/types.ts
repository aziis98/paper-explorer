export interface Paper {
  id: string
  title: string
  year: number | null
  date: string | null
  pubDate: string | null
  createdDate: string | null
  citations: number
  authors: string
  color: string
  doi?: string | null
  isRef: boolean
  parentId?: string | null
  refsLoaded: boolean
  referencedWorks?: string[] | null
  metadataLoaded?: boolean
  arxivUrl?: string | null
  pdfUrl?: string | null
}

export interface Connection {
  fromId: string
  toId: string
}
