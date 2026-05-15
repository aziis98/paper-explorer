import {
  $,
  extractDOIs,
  extractBibtexTitles,
  getAuthors,
  getMinYear,
  getMinDate,
  formatDate,
  getArXivUrl,
  getPdfUrl,
} from '../utils'
import {
  fetchWorksByDOIs,
  searchDOIByTitleOA,
  searchDOIByTitleSS,
} from '../api'
import type { Paper } from '../types'

export interface ImportModalOptions {
  onImport: (papers: Paper[]) => void
}

interface ImportEntry {
  id: string
  title: string
  doi: string | null
  status: 'pending' | 'resolving' | 'fetching' | 'success' | 'error'
  error?: string
  paperData?: Paper
  selected: boolean
}

export function ImportModal(options: ImportModalOptions) {
  let pastedText = ''
  let selectedBackend: 'oa' | 'ss' = 'oa'
  let entries: ImportEntry[] = []
  let isProcessing = false
  let isCancelled = false

  const overlay = $('div', { className: 'modal-overlay' })

  const header = $(
    'div',
    { className: 'modal-header' },
    $('h2', {}, 'Import Papers'),
    $(
      'button',
      { className: 'modal-close', onClick: close },
      $('iconify-icon', { icon: 'mdi:close' }),
    ),
  )

  // --- Input View ---
  const tabUpload = $(
    'button',
    {
      className: 'modal-tab active',
      onClick: () => setTab('upload'),
    },
    'Upload .bib / .txt',
  )

  const tabPaste = $(
    'button',
    {
      className: 'modal-tab',
      onClick: () => setTab('paste'),
    },
    'Paste DOIs / Text',
  )

  const tabs = $(
    'div',
    { className: 'modal-tabs' },
    tabUpload,
    tabPaste,
  )

  const fileInput = document.createElement('input')
  fileInput.type = 'file'
  fileInput.accept = '.bib,.txt'
  fileInput.style.display = 'none'

  fileInput.onchange = async e => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    pastedText = await file.text()
    startImport()
  }

  const uploadArea = $(
    'div',
    {
      className: 'modal-upload-area',
      onClick: () => {
        if (selectedBackend === 'ss' && !localStorage.getItem('ss_api_key')) return
        fileInput.click()
      },
      onDragOver: (e: DragEvent) => {
        if (selectedBackend === 'ss' && !localStorage.getItem('ss_api_key')) return
        e.preventDefault()
        uploadArea.classList.add('dragover')
      },
      onDragLeave: () =>
        uploadArea.classList.remove('dragover'),
      onDrop: async (e: DragEvent) => {
        if (selectedBackend === 'ss' && !localStorage.getItem('ss_api_key')) return
        e.preventDefault()
        uploadArea.classList.remove('dragover')
        const file = e.dataTransfer?.files[0]
        if (!file) return
        pastedText = await file.text()
        startImport()
      },
    },
  )

  function refreshUploadArea() {
    uploadArea.innerHTML = ''
    const isSS = selectedBackend === 'ss'
    const hasKey = !!localStorage.getItem('ss_api_key')
    
    if (isSS && !hasKey) {
      uploadArea.classList.add('disabled')
      uploadArea.append(
        $('iconify-icon', {
          icon: 'mdi:api-off',
          className: 'modal-upload-icon',
          style: { color: '#ef4444' }
        }),
        $('div', { className: 'modal-upload-text' }, 'API Key Required'),
        $('div', { className: 'modal-upload-subtext' }, 'Please set your Semantic Scholar API key to use upload')
      )
    } else {
      uploadArea.classList.remove('disabled')
      uploadArea.append(
        $('iconify-icon', {
          icon: 'mdi:cloud-upload',
          className: 'modal-upload-icon',
        }),
        $('div', { className: 'modal-upload-text' }, 'Click or drag file to upload'),
        $('div', { className: 'modal-upload-subtext' }, 'Supports .bib and .txt files')
      )
    }
  }

  refreshUploadArea()

  const textarea = $('textarea', {
    className: 'modal-textarea',
    placeholder:
      'Paste your BibTeX or list of DOIs here...\n\nExample:\n10.1038/s41586-020-2649-2\n10.1126/science.1234567',
    onInput: (e: Event) => {
      pastedText = (e.target as HTMLTextAreaElement).value
      updateImportButton()
    },
  })

  const contentArea = $(
    'div',
    { className: 'modal-content' },
    uploadArea,
  )

  const btnApiKey = $(
    'button',
    {
      className: 'modal-action-btn',
      style: { display: 'none' },
      onClick: () => {
        const key = prompt('Enter Semantic Scholar API Key:', localStorage.getItem('ss_api_key') || '')
        if (key !== null) {
          if (key.trim()) localStorage.setItem('ss_api_key', key.trim())
          else localStorage.removeItem('ss_api_key')
          updateApiKeyButton()
        }
      },
    },
    $('iconify-icon', { icon: 'mdi:api-off' }),
  )

  function updateApiKeyButton() {
    const hasKey = !!localStorage.getItem('ss_api_key')
    const icon = btnApiKey.querySelector('iconify-icon')
    if (icon) {
      icon.setAttribute('icon', hasKey ? 'mdi:api' : 'mdi:api-off')
    }
    btnApiKey.style.color = hasKey ? '#22c55e' : '#ef4444'
    btnApiKey.title = hasKey ? 'Semantic Scholar API Key Set' : 'Semantic Scholar API Key Missing (Rate limited)'
    refreshUploadArea()
  }

  const backendSelect = $(
    'select',
    {
      className: 'modal-select',
      onChange: (e: Event) => {
        selectedBackend = (e.target as HTMLSelectElement)
          .value as 'oa' | 'ss'
        
        const isSS = selectedBackend === 'ss'
        btnApiKey.style.display = isSS ? 'flex' : 'none'
        
        if (isSS) {
          updateApiKeyButton()
        }
        
        refreshUploadArea()
      },
    },
    $('option', { value: 'oa' }, 'OpenAlex Resolver'),
    $(
      'option',
      { value: 'ss' },
      'Semantic Scholar Resolver',
    ),
  )

  const btnCancel = $(
    'button',
    { className: 'btn btn-secondary', onClick: close },
    'Cancel',
  )

  const btnImport = $(
    'button',
    {
      className: 'btn btn-primary',
      style: { display: 'none' },
      onClick: startImport,
    },
    $('iconify-icon', { icon: 'mdi:import' }),
    'Import',
  )

  const footer = $(
    'div',
    { className: 'modal-footer' },
    backendSelect,
    btnApiKey,
    btnCancel,
    btnImport,
  )

  const container = $(
    'div',
    { className: 'modal-container' },
    header,
    tabs,
    contentArea,
    footer,
  )

  overlay.appendChild(container)
  overlay.appendChild(fileInput)

  // --- Processing View ---
  const progressBar = $('div', { className: 'progress-bar' })
  const progressContainer = $(
    'div',
    { className: 'progress-container' },
    progressBar,
  )
  const statusMain = $('div', { className: 'status-main' })
  const statusSub = $('div', { className: 'status-sub' })

  const processingView = $(
    'div',
    { className: 'modal-processing' },
    statusMain,
    statusSub,
    progressContainer,
  )

  // --- Review View ---
  const reviewListSuccess = $('div', { className: 'modal-review-list' })
  const reviewListFailed = $('div', { className: 'modal-review-list' })

  const failedSection = $(
    'div',
    { className: 'modal-review-section failed' },
    $(
      'div',
      { className: 'status-main', style: { marginBottom: '8px', color: '#ef4444' } },
      'Failed / No DOI Found:',
    ),
    reviewListFailed,
  )

  const reviewView = $(
    'div',
    { className: 'modal-review' },
    $(
      'div',
      { className: 'modal-review-section' },
      $(
        'div',
        { className: 'status-main', style: { marginBottom: '8px' } },
        'Papers to Import:',
      ),
      reviewListSuccess,
    ),
    failedSection,
  )

  function setTab(tab: 'upload' | 'paste') {
    if (tab === 'upload') {
      tabUpload.classList.add('active')
      tabPaste.classList.remove('active')
      contentArea.innerHTML = ''
      contentArea.appendChild(uploadArea)
      btnImport.style.display = 'none'
    } else {
      tabPaste.classList.add('active')
      tabUpload.classList.remove('active')
      contentArea.innerHTML = ''
      contentArea.appendChild(textarea)
      btnImport.style.display = 'flex'
      updateImportButton()
      setTimeout(() => textarea.focus(), 50)
    }
  }

  function updateImportButton() {
    btnImport.disabled = pastedText.trim().length === 0
  }

  function close() {
    isCancelled = true
    overlay.classList.remove('visible')
    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay)
      }
    }, 200)
  }

  async function startImport() {
    if (isProcessing) return
    isProcessing = true
    isCancelled = false

    const dois = extractDOIs(pastedText)
    const titles = extractBibtexTitles(pastedText)

    if (!dois.length && !titles.length) {
      alert('No valid DOIs or BibTeX titles found.')
      isProcessing = false
      return
    }

    // Switch to processing view
    tabs.style.display = 'none'
    contentArea.innerHTML = ''
    contentArea.appendChild(processingView)
    backendSelect.style.display = 'none'
    btnImport.style.display = 'none'
    btnCancel.textContent = 'Cancel'
    btnCancel.onclick = () => {
      isCancelled = true
      close()
    }

    entries = []
    const doiSet = new Set<string>()
    const titleSet = new Set<string>()

    // 1. Extract DOIs from everywhere (plain text or BibTeX fields)
    const allDois = extractDOIs(pastedText)
    allDois.forEach(doi => {
      const normalizedDoi = doi.toLowerCase()
      if (!doiSet.has(normalizedDoi)) {
        doiSet.add(normalizedDoi)
        entries.push({
          id: Math.random().toString(36).substr(2, 9),
          title: normalizedDoi,
          doi: normalizedDoi,
          status: 'pending',
          selected: true,
        })
      }
    })

    // 2. Extract BibTeX titles that DON'T have a DOI already found
    const bibData = extractBibtexTitles(pastedText) // Now returns titles without DOIs
    bibData.forEach(title => {
      if (!titleSet.has(title)) {
        titleSet.add(title)
        entries.push({
          id: Math.random().toString(36).substr(2, 9),
          title,
          doi: null,
          status: 'pending',
          selected: true,
        })
      }
    })

    // Phase 1: Resolve Titles
    const toResolve = entries.filter(e => !e.doi)
    if (toResolve.length > 0) {
      const resolver =
        selectedBackend === 'oa'
          ? searchDOIByTitleOA
          : searchDOIByTitleSS
      const backendName =
        selectedBackend === 'oa' ? 'OpenAlex' : 'SemScholar'

      for (let i = 0; i < toResolve.length; i++) {
        if (isCancelled) return
        const entry = toResolve[i]
        entry.status = 'resolving'
        updateProgress(
          `Resolving ${i + 1} of ${toResolve.length}`,
          ((i + 1) / toResolve.length) * 50,
          `[${backendName}] ${entry.title}`,
        )

        try {
          const doi = await resolver(entry.title)
          if (doi) {
            entry.doi = doi
            entry.status = 'pending'
          } else {
            entry.status = 'error'
            entry.error = 'Could not resolve DOI'
            entry.selected = false
          }
        } catch (e) {
          entry.status = 'error'
          entry.error = 'Resolution failed'
          entry.selected = false
        }
        // Small delay to be nice to APIs
        await new Promise(resolve =>
          setTimeout(
            resolve,
            selectedBackend === 'oa' ? 100 : 200,
          ),
        )
      }
    }

    // Phase 2: Fetch Metadata
    if (isCancelled) return
    const resolvedEntries = entries.filter(e => e.doi && e.status !== 'error')
    if (resolvedEntries.length > 0) {
      updateProgress('Fetching paper metadata...', 75, 'Getting full records from OpenAlex')
      const allDois = resolvedEntries.map(e => e.doi!)
      try {
        const results = await fetchWorksByDOIs(allDois)
        
        // Map results back to entries
        resolvedEntries.forEach(entry => {
          const work = results.find(
            (w: any) =>
              w.doi?.toLowerCase() ===
              entry.doi?.toLowerCase() ||
              w.doi?.toLowerCase() ===
              'https://doi.org/' + entry.doi?.toLowerCase(),
          )
          if (work) {
            entry.status = 'success'
            entry.paperData = {
              id: work.id,
              title: work.title || 'Untitled',
              year: getMinYear(work),
              date: getMinDate(work),
              pubDate: formatDate(work.publication_date),
              createdDate: formatDate(work.created_date),
              citations: work.cited_by_count || 0,
              authors: getAuthors(work),
              color: '#00d4ff',
              doi: work.doi,
              arxivUrl: getArXivUrl(work),
              pdfUrl: getPdfUrl(work),
              isSecondary: false,
              parentId: null,
              refsLoaded: false,
              referencedWorks: work.referenced_works || null,
            }
          } else {
            entry.status = 'error'
            entry.error = 'Metadata not found'
            entry.selected = false
          }
        })
      } catch (e) {
        resolvedEntries.forEach(entry => {
          entry.status = 'error'
          entry.error = 'Fetch failed'
          entry.selected = false
        })
      }
    }

    // Final Deduplication by canonical DOI (if metadata found)
    const finalEntries: ImportEntry[] = []
    const finalDoiSet = new Set<string>()
    entries.forEach(entry => {
      const canonicalDoi = entry.paperData?.doi?.toLowerCase() || entry.doi?.toLowerCase()
      if (canonicalDoi) {
        if (!finalDoiSet.has(canonicalDoi)) {
          finalDoiSet.add(canonicalDoi)
          finalEntries.push(entry)
        }
      } else {
        finalEntries.push(entry)
      }
    })
    entries = finalEntries

    updateProgress('Done!', 100, 'Processing complete')
    showReview()
  }

  function updateProgress(main: string, percent: number, sub: string = '') {
    statusMain.textContent = main
    statusSub.textContent = sub
    progressBar.style.width = `${percent}%`
  }

  function showReview() {
    contentArea.innerHTML = ''
    contentArea.appendChild(reviewView)
    renderReviewList()

    btnImport.style.display = 'flex'
    btnImport.textContent = 'Finalize Import'
    btnImport.disabled = !entries.some(e => e.selected)
    btnImport.onclick = () => {
      const selectedPapers = entries
        .filter(e => e.selected && e.paperData)
        .map(e => e.paperData!)
      options.onImport(selectedPapers)
      close()
    }

    btnCancel.textContent = 'Cancel'
  }

  async function resolveEntry(entry: ImportEntry, manualDoi: string) {
    if (isProcessing) return
    isProcessing = true
    isCancelled = false
    
    // Switch to processing view
    contentArea.innerHTML = ''
    contentArea.appendChild(processingView)
    btnImport.style.display = 'none'
    tabs.style.display = 'none'
    backendSelect.style.display = 'none'
    
    entry.doi = manualDoi.replace(/^https?:\/\/doi\.org\//, '').toLowerCase()
    entry.status = 'pending'
    entry.error = undefined
    
    updateProgress('Fetching metadata...', 50, entry.doi)
    
    try {
      const results = await fetchWorksByDOIs([entry.doi])
      const work = results[0]
      if (work) {
        entry.status = 'success'
        entry.paperData = {
          id: work.id,
          title: work.title || 'Untitled',
          year: getMinYear(work),
          date: getMinDate(work),
          pubDate: formatDate(work.publication_date),
          createdDate: formatDate(work.created_date),
          citations: work.cited_by_count || 0,
          authors: getAuthors(work),
          color: '#00d4ff',
          doi: work.doi,
          arxivUrl: getArXivUrl(work),
          pdfUrl: getPdfUrl(work),
          isSecondary: false,
          parentId: null,
          refsLoaded: false,
          referencedWorks: work.referenced_works || null,
        }
        entry.selected = true
      } else {
        entry.status = 'error'
        entry.error = 'Metadata not found'
      }
    } catch (e) {
      entry.status = 'error'
      entry.error = 'Fetch failed'
    }
    
    isProcessing = false
    updateProgress('Done!', 100, 'Resolved manual entry')
    
    // Small delay so the user sees the progress bar at 100%
    await new Promise(r => setTimeout(r, 400))
    
    showReview()
  }

  function renderReviewList() {
    reviewListSuccess.innerHTML = ''
    reviewListFailed.innerHTML = ''

    const hasErrors = entries.some(e => e.status === 'error')
    failedSection.style.display = hasErrors ? 'flex' : 'none'

    entries.forEach(entry => {
      const isError = entry.status === 'error'
      const targetList = isError ? reviewListFailed : reviewListSuccess

      const item = $(
        'div',
        { className: `review-item ${isError ? 'error' : ''}` },
        !isError
          ? $(
              'input',
              {
                type: 'checkbox',
                className: 'review-item-checkbox',
                checked: entry.selected,
                onChange: (e: Event) => {
                  entry.selected = (e.target as HTMLInputElement).checked
                  btnImport.disabled = !entries.some(e => e.selected)
                },
              },
            )
          : $('iconify-icon', {
              icon: 'mdi:alert-circle',
              className: 'review-item-error-icon',
            }),
        $(
          'div',
          { className: 'review-item-info' },
          $(
            'div',
            { className: 'review-item-title' },
            entry.paperData ? entry.paperData.title : entry.title,
          ),
          entry.paperData
            ? $(
                'div',
                { className: 'review-item-meta' },
                [
                  entry.paperData.authors,
                  entry.paperData.year
                    ? ` · ${entry.paperData.year}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(''),
              )
            : $(
                'div',
                { className: 'review-item-error-msg' },
                entry.error || 'Resolution failed',
              ),
          isError
            ? $(
                'div',
                { className: 'review-item-fix-container' },
                $(
                  'input',
                  {
                    type: 'text',
                    placeholder: 'Paste DOI here...',
                    className: 'review-item-doi-input',
                    onKeyDown: async (e: KeyboardEvent) => {
                      if (e.key === 'Enter') {
                        const input = e.target as HTMLInputElement
                        const val = input.value.trim()
                        if (val) {
                          const btn = input.nextElementSibling as HTMLButtonElement
                          const originalText = btn.textContent
                          btn.disabled = true
                          btn.innerHTML = '<iconify-icon icon="mdi:loading" class="spin"></iconify-icon>'
                          try {
                            await resolveEntry(entry, val)
                          } catch (err) {
                            btn.disabled = false
                            btn.textContent = originalText
                          }
                        }
                      }
                    }
                  },
                ),
                $(
                  'button',
                  {
                    className: 'review-item-resolve-btn',
                    onClick: async (e: Event) => {
                      const btn = e.currentTarget as HTMLButtonElement
                      const input = btn.previousElementSibling as HTMLInputElement
                      const val = input.value.trim()
                      if (val) {
                        const originalText = btn.textContent
                        btn.disabled = true
                        btn.innerHTML = '<iconify-icon icon="mdi:loading" class="spin"></iconify-icon>'
                        try {
                          await resolveEntry(entry, val)
                        } catch (err) {
                          btn.disabled = false
                          btn.textContent = originalText
                        }
                      }
                    }
                  },
                  'Resolve'
                )
              )
            : null
        ),
        $(
          'div',
          { className: 'review-item-side' },
          $(
            'div',
            { className: 'review-item-doi-container' },
            entry.paperData?.doi
              ? [
                  $('iconify-icon', { icon: 'mdi:link-variant' }),
                  $(
                    'a',
                    {
                      href: entry.paperData.doi.startsWith('http')
                        ? entry.paperData.doi
                        : `https://doi.org/${entry.paperData.doi}`,
                      target: '_blank',
                      className: 'review-item-doi-link',
                    },
                    'DOI',
                  ),
                ]
              : entry.doi && !isError
                ? [
                    $('iconify-icon', { icon: 'mdi:link-variant' }),
                    $(
                      'a',
                      {
                        href: entry.doi.startsWith('http')
                          ? entry.doi
                          : `https://doi.org/${entry.doi}`,
                        target: '_blank',
                        className: 'review-item-doi-link',
                      },
                      'DOI',
                    ),
                  ]
                : null,
          ),
        ),
      )

      targetList.appendChild(item)
    })
  }
  return {
    show() {
      document.body.appendChild(overlay)
      void overlay.offsetWidth
      overlay.classList.add('visible')

      // Reset state
      isProcessing = false
      isCancelled = false
      tabs.style.display = 'flex'
      backendSelect.style.display = 'block'
      btnImport.style.display = 'none'
      btnCancel.textContent = 'Cancel'
      btnCancel.onclick = close
      setTab('upload')
      textarea.value = ''
      pastedText = ''
      fileInput.value = ''
    },
  }
}
