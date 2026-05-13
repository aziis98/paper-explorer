import { $ } from '../utils'

export interface ImportModalOptions {
  onImport: (text: string) => void
}

export function ImportModal(options: ImportModalOptions) {
  let pastedText = ''

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
    const text = await file.text()
    close()
    options.onImport(text)
  }

  const uploadArea = $(
    'div',
    {
      className: 'modal-upload-area',
      onClick: () => fileInput.click(),
      onDragOver: (e: DragEvent) => {
        e.preventDefault()
        uploadArea.classList.add('dragover')
      },
      onDragLeave: () =>
        uploadArea.classList.remove('dragover'),
      onDrop: async (e: DragEvent) => {
        e.preventDefault()
        uploadArea.classList.remove('dragover')
        const file = e.dataTransfer?.files[0]
        if (!file) return
        const text = await file.text()
        close()
        options.onImport(text)
      },
    },
    $('iconify-icon', {
      icon: 'mdi:cloud-upload',
      className: 'modal-upload-icon',
    }),
    $(
      'div',
      { className: 'modal-upload-text' },
      'Click or drag file to upload',
    ),
    $(
      'div',
      { className: 'modal-upload-subtext' },
      'Supports .bib and .txt files',
    ),
  )

  const textarea = $('textarea', {
    className: 'modal-textarea',
    placeholder:
      'Paste your BibTeX or list of DOIs here...\n\nExample:\n10.1038/s41586-020-2649-2\n10.1126/science.1234567',
    onInput: (e: Event) => {
      pastedText = (e.target as HTMLTextAreaElement).value
      updateImportButton()
    },
  }) as HTMLTextAreaElement

  const contentArea = $(
    'div',
    { className: 'modal-content' },
    uploadArea,
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
      onClick: () => {
        if (pastedText.trim()) {
          close()
          options.onImport(pastedText)
        }
      },
    },
    $('iconify-icon', { icon: 'mdi:import' }),
    'Import',
  ) as HTMLButtonElement

  const footer = $(
    'div',
    { className: 'modal-footer' },
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
    overlay.classList.remove('visible')
    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay)
      }
    }, 200)
  }

  return {
    show() {
      document.body.appendChild(overlay)
      // Force reflow for transition
      void overlay.offsetWidth
      overlay.classList.add('visible')

      // Reset state
      setTab('upload')
      textarea.value = ''
      pastedText = ''
      fileInput.value = ''
    },
  }
}
