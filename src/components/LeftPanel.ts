import type { Paper } from '../types'
import { $, trunc, fmt } from '../utils'

export interface LeftPanelOptions {
  onPaperClick: (paper: Paper) => void
  onRemovePaper: (id: string) => void
  onExport: (type: 'primary' | 'all') => void
  onImport: () => void
  onMakeSecondary: (id: string) => void
  onRemoveAllPapers: (type: 'primary' | 'secondary') => void
}

export function LeftPanel(
  el: HTMLElement,
  options: LeftPanelOptions,
) {
  el.innerHTML = ''

  const header = $(
    'div',
    { className: 'sidebar-header sidebar-header-col' },
    $(
      'div',
      { className: 'sidebar-header-row' },
      $('h2', {}, 'Graph Papers'),
      $('span', {
        id: 'totals-badge',
        className: 'totals-badge',
      }),
    ),
    $(
      'div',
      { className: 'sidebar-header-actions' },
      $(
        'button',
        {
          id: 'import-btn',
          className: 'export-btn',
          style: { background: 'white' },
          onClick: () => options.onImport(),
          title: 'Import papers via .bib or DOIs',
        },
        $('iconify-icon', { icon: 'mdi:upload' }),
        'Import Papers',
      ),
      $(
        'button',
        {
          id: 'cancel-import-btn',
          className: 'export-btn',
          style: { display: 'none', background: '#fee2e2', color: '#dc2626' },
          title: 'Cancel Import',
        },
        $('iconify-icon', { icon: 'mdi:close' }),
      )
    ),
    $(
      'div',
      { className: 'sidebar-header-actions' },
      $(
        'button',
        {
          className: 'export-btn',
          onClick: () => options.onExport('primary'),
          title: 'Export Primary .bib',
        },
        $('iconify-icon', { icon: 'mdi:download' }),
        'Primary',
      ),
      $(
        'button',
        {
          className: 'export-btn',
          onClick: () => options.onExport('all'),
          title: 'Export All .bib',
        },
        $('iconify-icon', { icon: 'mdi:download-multiple' }),
        'All',
      ),
      $(
        'div',
        { className: 'info-popup-container ml-auto' },
        $('iconify-icon', {
          icon: 'mdi:information-outline',
          style: 'font-size: 16px',
        }),
        $(
          'div',
          { className: 'info-popup-content' },
          $('strong', {}, 'BibTeX Export Specification'),
          $(
            'p',
            { className: 'info-popup-desc' },
            'The exported file will be a plaintext .bib file formatted for compatibility with LaTeX and modern reference managers (Zotero, Mendeley, etc).',
          ),
          $(
            'pre',
            {},
            `@article{Einstein1905W312345678,
  title = {On the Electrodynamics of Moving Bodies},
  author = {Einstein and others},
  year = {1905},
  doi = {10.1002/andp.19053221004},
  url = {https://openalex.org/W312345678}
}`,
          ),
          $(
            'ul',
            { className: 'info-popup-list' },
            $(
              'li',
              { className: 'info-popup-list-item' },
              $(
                'strong',
                { className: 'text-dark' },
                'Citation Key: ',
              ),
              'Generated as ',
              $(
                'code',
                { className: 'inline-code' },
                'FirstAuthorYear + OpenAlexID',
              ),
              ' to guarantee uniqueness.',
            ),
            $(
              'li',
              { className: 'info-popup-list-item' },
              $(
                'strong',
                { className: 'text-dark' },
                'Authors: ',
              ),
              'Last names are properly delimited with ',
              $(
                'code',
                { className: 'inline-code' },
                'and',
              ),
              ', or truncated with ',
              $(
                'code',
                { className: 'inline-code' },
                'and others',
              ),
              '.',
            ),
            $(
              'li',
              {},
              $(
                'strong',
                { className: 'text-dark' },
                'Fields: ',
              ),
              'Includes title, year, clean DOI, and the original OpenAlex URL.',
            ),
          ),
        ),
      ),
    ),
  )

  const list = $('div', {
    id: 'papers-list',
    className: 'papers-list',
  })
  const emptyMsg = $(
    'div',
    { id: 'empty-msg', className: 'empty-msg' },
    $('iconify-icon', {
      icon: 'mdi:Graph-outline',
      className: 'empty-msg-icon',
    }),
    $(
      'p',
      {},
      'Graph is empty. Search and add papers to start exploring.',
    ),
  )

  const totalsBadge = header.querySelector(
    '#totals-badge',
  ) as HTMLElement | null

  el.append(header, list)
  list.appendChild(emptyMsg)

  // Setup mousedown/wheel blocker so it doesn't pan/zoom the map
  const mousedownHandler = (e: Event) => e.stopPropagation()
  const wheelHandler = (e: Event) => e.stopPropagation()
  el.addEventListener('mousedown', mousedownHandler)
  el.addEventListener('wheel', wheelHandler, {
    passive: false,
  })

  return {
    update(papers: Paper[], selectedId: string | null) {
      const direct = papers.filter(p => !p.isSecondary)
      const secondary = papers.filter(p => p.isSecondary)

      if (emptyMsg) {
        emptyMsg.style.display = direct.length
          ? 'none'
          : 'block'
      }

      const refs = papers.length - direct.length
      if (totalsBadge) {
        totalsBadge.textContent = refs
          ? `${direct.length} + ${refs} refs`
          : direct.length
            ? `${direct.length}`
            : ''
      }

      if (!list) return
      list.innerHTML = ''

      const createItem = (p: Paper, isMain: boolean) => {
        const isSelected = p.id === selectedId
        return $(
          'div',
          {
            className: `left-panel-item ${isSelected ? 'selected' : ''} ${isMain ? 'main' : 'ref'}`,
            title: isMain
              ? ''
              : 'Click to make this a primary node',
            onClick: () => options.onPaperClick(p),
          },
          $('span', {
            className: `left-panel-item-dot ${p.isSecondary ? 'ref' : ''}`,
            style: {
              background: p.isSecondary ? '#64748b' : p.color,
            },
          }),
          $(
            'div',
            { className: 'left-panel-item-content' },
            $(
              'p',
              {
                className: `left-panel-item-title ${p.isSecondary ? 'ref' : ''}`,
              },
              trunc(p.title, 58),
            ),
            $(
              'p',
              { className: 'left-panel-item-authors' },
              trunc(p.authors, 75),
            ),
            $(
              'p',
              { className: 'left-panel-item-meta' },
              `${p.date || p.year || '?'} · ${fmt(p.citations)} citations`,
            ),
          ),
          $(
            'div',
            { className: 'left-panel-item-actions' },
            $(
              'button',
              {
                className: 'left-panel-action-btn remove',
                title: 'Remove paper from graph',
                onClick: (e: Event) => {
                  e.stopPropagation()
                  options.onRemovePaper(p.id)
                },
              },
              $('iconify-icon', { icon: 'mdi:close' }),
            ),
            !p.isSecondary
              ? $(
                  'button',
                  {
                    className: 'left-panel-action-btn secondary',
                    title: 'Move to secondary papers',
                    onClick: (e: Event) => {
                      e.stopPropagation()
                      options.onMakeSecondary(p.id)
                    },
                  },
                  $(
                    'iconify-icon',
                    { icon: 'mdi:bookmark-off-outline' },
                  ),
                )
              : null,
          ),
        )
      }

      if (direct.length > 0) {
        list.appendChild(
          $(
            'div',
            {
              className: 'left-panel-section-title',
            },
            'PRIMARY PAPERS',
            $(
              'button',
              {
                className: 'left-panel-action-btn remove-all',
                title: 'Remove all primary papers',
                onClick: (e: Event) => {
                  e.stopPropagation()
                  if (confirm('Are you sure you want to remove ALL primary papers from the graph?')) {
                    options.onRemoveAllPapers('primary')
                  }
                },
              },
              $('iconify-icon', { icon: 'mdi:delete-outline' }),
            )
          ),
        )
        direct.forEach(p =>
          list.appendChild(createItem(p, true)),
        )
      }

      if (secondary.length > 0) {
        list.appendChild(
          $(
            'div',
            {
              className: 'left-panel-section-title',
            },
            'SECONDARY PAPERS',
            $(
              'button',
              {
                className: 'left-panel-action-btn remove-all',
                title: 'Remove all secondary papers',
                onClick: (e: Event) => {
                  e.stopPropagation()
                  if (confirm('Are you sure you want to remove ALL secondary papers from the graph?')) {
                    options.onRemoveAllPapers('secondary')
                  }
                },
              },
              $('iconify-icon', { icon: 'mdi:delete-outline' }),
            )
          ),
        )
        secondary.forEach(p =>
          list.appendChild(createItem(p, false)),
        )
      }
    },
    unmount() {
      el.removeEventListener('mousedown', mousedownHandler)
      el.removeEventListener('wheel', wheelHandler)
    },
  }
}
