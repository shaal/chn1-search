import { html, LitElement, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import componentStyles from './outline-yext-pager.css?inline';
import { ResizeController } from '../../controllers/resize-controller';
import { AdoptedStylesheets } from '@phase2/outline-adopted-stylesheets-controller';

@customElement('outline-yext-pager')
export class OutlineYextPager extends LitElement {
  createRenderRoot() {
    const root = super.createRenderRoot();
    // this.EncapsulatedStylesheets = this.shadowRoot
    //   ? new AdoptedStylesheets(this, componentStyles, this.shadowRoot)
    //   : undefined;
    new AdoptedStylesheets(this, componentStyles, this.shadowRoot!);
    return root;
  }

  resizeController = new ResizeController(this);

  @property({ type: Number, reflect: true, attribute: 'current-page' })
  currentPage = 0;

  @property({ type: Number, reflect: true, attribute: 'total-pages' })
  totalPages = 100;

  @property({ type: Number, reflect: true, attribute: 'max-pages-in-pager' })
  maxPagesInPager = 4;

  pageNumbers: number[] = [];

  headingId = 'hid';

  isMobile = true;

  generatePageNumbers(totalPages: number): number[] {
    const pageNumbers = [];
    for (let i = 1; i <= totalPages; i++) {
      pageNumbers.push(i);
    }
    return pageNumbers;
  }

  selectPageNumbers<T extends number>(
    pageNumbers: T[],
    currentPage: T,
    x: number
  ): T[] {
    // Get the index of the current page in the original array
    const currentIndex = pageNumbers.indexOf(currentPage);

    // Calculate the start and end index of the selected items
    let startIndex = Math.max(0, currentIndex - Math.floor(x / 2));
    let endIndex = Math.min(pageNumbers.length - 1, startIndex + x - 1);

    // Adjust the start and end index if necessary to keep the current page in the middle
    if (endIndex - startIndex < x - 1) {
      endIndex = Math.min(
        pageNumbers.length - 1,
        currentIndex + Math.ceil(x / 2) - 1
      );
      startIndex = Math.max(0, endIndex - x + 1);
    }

    // Return the selected page numbers in their original order
    return pageNumbers.slice(startIndex, endIndex + 1);
  }

  updateCurrentPage(e: Event) {
    // Prevent the default behavior of the link
    e.preventDefault();
    const eventTarget = e.currentTarget as HTMLAnchorElement;
    const page = eventTarget.getAttribute('data-page');
    if (page) {
      this.currentPage = parseInt(page);
    }
  }

  render(): TemplateResult {
    this.pageNumbers = this.generatePageNumbers(this.totalPages);
    const { headingId, pageNumbers, currentPage, maxPagesInPager } = this;

    if (pageNumbers.length === 0) {
      return html` <slot></slot> `;
    }

    this.isMobile = this.resizeController.currentBreakpointRange === 0;

    return html`
      <nav
        class="pager layout--content-medium ${this.isMobile ? 'mobile' : null}"
        role="navigation"
        aria-labelledby="${headingId}"
      >
        <h4 id="${headingId}" class="visually-hidden">${'pager'}</h4>
        <ul class="pager-items">
          ${currentPage !== 1
            ? html`
                <li class="pager-item pager-item--previous">
                  <a
                    href="#"
                    title="Go to previous page"
                    rel="prev"
                    class="pager__link"
                    data-page="${currentPage - 1}"
                    @click=${this.updateCurrentPage}
                  >
                    <
                  </a>
                </li>
              `
            : ''}
          ${this.selectPageNumbers(
            pageNumbers,
            currentPage,
            maxPagesInPager
          ).map(key => {
            const isCurrent = currentPage === key;
            const title = isCurrent ? 'current page' : `Go to page ${key}`;
            return html`
              <li
                class="pager-item pager-item--page ${isCurrent
                  ? 'pager-item--current'
                  : ''}"
              >
                ${currentPage !== key
                  ? html` <a
                      href="#"
                      data-page=${key}
                      title="${title}"
                      class="pager__link"
                      @click=${this.updateCurrentPage}
                    >
                      <span class="visually-hidden">
                        ${isCurrent ? 'current page' : 'Page'}
                      </span>
                      ${key}
                    </a>`
                  : html` <span class="visually-hidden">
                        ${isCurrent ? 'current page' : 'Page'}
                      </span>
                      ${key}`}
              </li>
            `;
          })}
          ${currentPage - 1 < this.totalPages - (maxPagesInPager / 2 + 0.5)
            ? html`
                <li class="pager-item pager-item--ellipsis">
                  <span>...</span>
                  <span class="visually-hidden">more pages</span>
                </li>
              `
            : ''}
          ${currentPage !== pageNumbers.length
            ? html`
                <li class="pager-item pager-item--next">
                  <a
                    href="#"
                    title="Go to next page"
                    rel="next"
                    class="pager__link"
                    data-page="${currentPage + 1}"
                    @click=${this.updateCurrentPage}
                  >
                    >
                  </a>
                </li>
              `
            : ''}
        </ul>
      </nav>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'outline-yext-pager': OutlineYextPager;
  }
}
