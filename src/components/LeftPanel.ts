import type { Paper } from '../types'
import { $, trunc, fmt } from '../utils'

export interface LeftPanelOptions {
  onPaperClick: (paper: Paper) => void
  onRemovePaper: (id: string) => void
  onExport: (type: 'primary' | 'all') => void
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
          className: 'export-btn',
          onClick: () => options.onExport('primary'),
        },
        $('iconify-icon', { icon: 'mdi:download' }),
        'Primary .bib',
      ),
      $(
        'button',
        {
          className: 'export-btn',
          onClick: () => options.onExport('all'),
        },
        $('iconify-icon', { icon: 'mdi:download' }),
        'All .bib',
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
      const direct = papers.filter(p => !p.isRef)
      const secondary = papers.filter(p => p.isRef)

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
            className: `left-panel-item-dot ${p.isRef ? 'ref' : ''}`,
            style: {
              background: p.isRef ? '#64748b' : p.color,
            },
          }),
          $(
            'div',
            { className: 'left-panel-item-content' },
            $(
              'p',
              {
                className: `left-panel-item-title ${p.isRef ? 'ref' : ''}`,
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
            'button',
            {
              className: 'left-panel-remove-btn',
              title: 'Remove paper from graph',
              onClick: (e: Event) => {
                e.stopPropagation()
                options.onRemovePaper(p.id)
              },
            },
            $('iconify-icon', { icon: 'mdi:close' }),
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
