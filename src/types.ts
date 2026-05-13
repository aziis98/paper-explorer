export interface Paper {
  /** The unique OpenAlex ID (e.g., 'https://openalex.org/W123456789') */
  id: string
  /** The full title of the paper */
  title: string
  /** The publication year */
  year: number | null
  /** The raw publication date string */
  date: string | null
  /** Formatted publication date for UI display */
  pubDate: string | null
  /** Formatted date when the record was created in OpenAlex */
  createdDate: string | null
  /** Total number of citations recorded in OpenAlex */
  citations: number
  /** Formatted string of author names (usually truncated with 'and others') */
  authors: string
  /** The hex color assigned to this paper node in the graph */
  color: string
  /** Digital Object Identifier (DOI) URL if available */
  doi?: string | null
  /** If true, this is a secondary paper (born via discovered connections) rather than a primary node */
  isSecondary: boolean
  /** The ID of the primary paper that this reference belongs to */
  parentId?: string | null
  /** Whether the list of referenced works has already been loaded for this paper */
  refsLoaded: boolean
  /** Array of OpenAlex IDs that this paper cites */
  referencedWorks?: string[] | null
  /** Internal flag to track if extended metadata has been fetched */
  metadataLoaded?: boolean
  /** Link to the arXiv landing page if applicable */
  arxivUrl?: string | null
  /** Direct link to the open access PDF if available */
  pdfUrl?: string | null
}

export interface Connection {
  /** The ID of the paper that is doing the citing */
  fromId: string
  /** The ID of the paper being cited */
  toId: string
}
