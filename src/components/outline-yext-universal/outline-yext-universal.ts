import { LitElement, html, noChange, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { classMap } from 'lit/directives/class-map.js';

import { Task } from '@lit/task';

import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import componentStyles from './outline-yext-universal.css.lit';
import { ResizeController } from '../../controllers/resize-controller';
import { debounce } from '../../utilities/debounce';
import type {
  SearchSettings,
  Result,
  UniversalSearchResponse,
  ResponseSearchSuggestions,
  ResultData,
  Module,
} from './outline-yext-types';

import '../outline-yext/outline-yext';

/**
 * The Yext Universal Search component.
 * @element outline-yext-universal
 */

@customElement('outline-yext-universal')
export class OutlineYextUniversal extends LitElement {
  static styles = [componentStyles];

  urlHref = 'https://cdn.yextapis.com/v2/accounts';
  accountId = 'me';
  contentType = 'search/query';
  apiKey = '0f3c031ce836961cf921558aca570af3';
  apiVersion = '20230406';
  apiVersionEntities = '20230301';
  version = 'PRODUCTION';
  locale = 'en';
  sortBys = 'relevance';
  pageTitle = 'Universal Search';
  experienceKey = 'universal-search';
  verticalKey = 'all';

  defaultSearchSettings: SearchSettings = {
    input: '',
    limit: 16,
    offset: 0,
  };

  searchSettings: SearchSettings = structuredClone(this.defaultSearchSettings);

  fields = 'firstName,lastName,data.id';
  requestUrlBase = `${this.urlHref}/${this.accountId}/${this.contentType}`;

  // @property()
  totalCount!: null | number;
  randomizationToken!: null | string;

  filterTempProfiles = false;

  @property({ type: Boolean, reflect: true, attribute: 'debug' })
  debug: boolean | undefined;

  @property({ type: Number, reflect: true, attribute: 'show-results' })
  showResults = 5;

  userLat!: number;
  userLong!: number;

  requestURL!: string;
  lastFetchTime!: null | number;

  @state()
  activeVertical: string = 'all';

  @state() isFocus = false;

  @state()
  entities!: [];

  @state()
  searchSuggestions: Result[] = [];

  @state() modalFiltersOpenClose = false;

  @state() searchFacetValues!: {
    [key: string]: string;
  };

  taskValue: unknown;

  connectedCallback() {
    super.connectedCallback();
    this.readParamsFromUrl();
  }

  /**
   * Handles a page change event, updating the data offset and triggering data retrieval.
   *
   * This function is typically used in pagination systems to respond to a page change event.
   * It calculates the data offset based on the clicked page number and updates the offset
   * in the search settings. Then, it triggers a data retrieval action, such as an API call.
   *
   * @param {Event} event - The page change event, typically a click event.
   */
  handlePageChange(event: Event) {
    const pageClicked = (event.target as HTMLElement).getAttribute(
      'current-page'
    );

    // Check if pageClicked is not null and is a valid number
    if (pageClicked !== null && !isNaN(Number(pageClicked))) {
      const offset = (Number(pageClicked) - 1) * this.searchSettings.limit;
      this.searchSettings.offset = offset;
      this.fetchEndpoint.run();
    }
  }

  resizeController = new ResizeController(this, {});

  /**
   * Constructs a URL for an HTTP request by combining static and dynamic parameters.
   *
   * This function assembles a URL for making an HTTP request, incorporating both static
   * parameters (constants or properties) and dynamic parameters derived from the
   * `this.searchSettings` object. It uses URLSearchParams objects to manage query parameters.
   *
   * @returns {void} This function does not return a value but updates the `this.requestURL` property.
   */
  prepareRequestURL() {
    const staticParams = new URLSearchParams();
    const dynamicParams = new URLSearchParams();
    staticParams.set('v', this.apiVersion);
    staticParams.set('api_key', this.apiKey);
    staticParams.set('experienceKey', this.experienceKey);
    // staticParams.set('verticalKey', this.verticalKey);
    staticParams.set('version', this.version);
    staticParams.set('locale', this.locale);
    staticParams.set('input', this.searchSettings.input || 'women');
    // dynamicParams.set('retrieveFacets', 'true');
    dynamicParams.set(
      'sortBys',
      JSON.stringify([{ type: this.sortBys.toUpperCase() }])
    );

    // Iterate over the search settings and add them to the dynamic parameters.
    for (const [key, value] of Object.entries(this.searchSettings)) {
      if (value !== '') {
        dynamicParams.set(key, JSON.stringify(value));
      } else {
        dynamicParams.delete(key);
      }
    }

    this.updateUrlWithSearchSettings(dynamicParams);

    const requestURL = `${
      this.requestUrlBase
    }?${staticParams.toString()}&${dynamicParams.toString()}`;

    let urlObject = new URL(requestURL);

    urlObject.searchParams.delete('limit');

    this.requestURL = urlObject.toString();
  }

  /**
   * Updates the query parameters of the current URL based on the provided parameters.
   *
   * This function allows for the modification of query parameters in the current URL. It removes
   * any existing query parameters with keys starting with 'yext_' and replaces them with new
   * parameters specified in the provided 'params' object. The updated URL is then reflected in
   * the browser's address bar without triggering a full page reload.
   *
   * @param {URLSearchParams} params - An object containing the new query parameters to be applied.
   */
  updateUrlWithSearchSettings(params: URLSearchParams) {
    // Get the current URL and its search parameters
    const url = new URL(window.location.href);
    const searchParams = new URLSearchParams(url.search);

    // Remove all `yext_` parameters from the params object
    const keysToDelete = [];

    for (const key of searchParams.keys()) {
      if (key.startsWith('yext_')) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => {
      searchParams.delete(key);
    });

    // Update the search parameters with the new params
    for (const [key, value] of params.entries()) {
      searchParams.set(`yext_${key}`, value);
    }

    // Replace the search parameters in the URL
    url.search = searchParams.toString();

    // Update the browser URL
    window.history.replaceState(null, '', url.toString());
  }

  /**
   * Reads and processes specific query parameters from the current URL and updates search settings.
   *
   * This function is used to extract query parameters from the current URL and populate the
   * `this.searchSettings` object with the extracted values. It specifically looks for query
   * parameters with keys that start with 'yext_', attempts to parse their values as JSON, and
   * assigns the parsed or original values to corresponding properties in `this.searchSettings`.
   * It is typically used for restoring and applying settings or filters based on the URL when
   * navigating within a web application.
   */
  readParamsFromUrl() {
    const currentUrl = new URL(window.location.href);
    const currentParams = new URLSearchParams(currentUrl.search);

    let parsedValue: string;
    // Merge the current parameters with the new parameters.
    for (const [key, value] of currentParams.entries()) {
      // Only process keys that start with 'yext_'
      if (key.startsWith('yext_')) {
        // Check if the value is a valid JSON string.
        try {
          parsedValue = JSON.parse(value);
        } catch (error) {
          // The value is not a valid JSON string.
          parsedValue = value;
        }

        // remove the 'yext_' at the beginning of key
        const cleanKey = key.replace('yext_', '');
        // Assign the parsed value to the searchSettings object.
        this.searchSettings[`${cleanKey}`] = parsedValue;
      }
    }
  }

  rawFilters: {} | undefined;

  fetchEndpoint = new Task(
    this,
    async () => {
      const startTime = performance.now();
      this.prepareRequestURL();

      const response = await fetch(this.requestURL, {});

      const jsonResponse: {
        meta: {};
        response: UniversalSearchResponse;
      } = await response.json();

      const endTime = performance.now();
      this.lastFetchTime = (endTime - startTime) / 1000;

      return jsonResponse;
    },
    () => [this.entities]
  );

  /**
   * Modifies the query parameters of the current URL and updates browser history.
   *
   * This function updates the query parameters of the current URL by adding or updating
   * a parameter named 'yext' with the provided 'entityId'. It then uses the browser's
   * history API to push a new state, reflecting the URL change in the address bar without
   * triggering a full page reload. Additionally, it may perform a 'refresh' operation
   * on a specific element within the shadow DOM, but the exact behavior depends on
   * the application's implementation.
   *
   * @param {string} entityId - The value to set for the 'yext' query parameter.
   */
  setURLParams(entityId: string) {
    // use URLSearchParams to get the query string from window.location.href
    const params = new URLSearchParams(window.location.search);
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    params.set('yext', entityId);

    const stateObj = { id: '100' };
    window.history.pushState(
      stateObj,
      'Page',
      `${origin}${pathname}?${params.toString()}`
    );
  }

  /**
   * Only used on individual vertical search
   *
   * from https://hitchhikers.yext.com/docs/contentdeliveryapis/search/verticalsearch
   */
  displayTotalCount() {
    if (this.totalCount) {
      const range1 = this.searchSettings.offset + 1;
      const range2 = Math.min(
        this.searchSettings.offset + this.searchSettings.limit,
        this.totalCount
      );
      return html`Showing <strong>${range1}-${range2}</strong> of
        ${this.totalCount} results `;
    }
    return null;
  }

  displayPending() {
    return html`
      <div class="lds-ring">
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
    `;
  }

  displayAll(response: UniversalSearchResponse) {
    console.log(response);
    if (response.modules?.length === 0) {
      return html` <h2>No results found</h2> `;
    }

    return html`
      <div class="results-list">
        ${repeat(
          response.modules,
          (module: Module) => module,
          (module) => html`
            <div class="results-section">
              <h2>${module.verticalConfigId}</h2>
              <div class="result">
                ${repeat(
                  module.results.slice(0, 3),
                  (result) => result,
                  (result) => html`
                    <a href="${result.data.c_uRL}"
                      ><h3>${result.data.name}</h3></a
                    >
                    <p>${result.data.c_body}</p>
                  `
                )}
              </div>
            </div>
          `
        )}
      </div>
    `;
  }

  sumResultsCount(searchResponse: UniversalSearchResponse): number {
    const { modules } = searchResponse;

    const totalResultsCount = modules.reduce(
      (sum, { resultsCount }) => sum + resultsCount,
      0
    );

    return totalResultsCount;
  }

  reset(e: Event) {
    e.preventDefault(); // prevent form submission
    this.searchSettings = structuredClone(this.defaultSearchSettings);
    this.sortBys = 'relevance';
    this.cleanSearchSuggestions();
    this.fetchEndpoint.run();
  }

  cleanSearchSuggestions() {
    this.searchSuggestions = [];
    this.isFocus = false;
  }

  search(e: Event) {
    // prevent form submission
    e.preventDefault();
    this.cleanSearchSuggestions();

    // save input before resetting searchSettings and then restore it back
    const inputSearch = this.searchSettings.input;
    this.searchSettings = structuredClone(this.defaultSearchSettings);
    this.searchSettings.input = inputSearch;

    this.fetchEndpoint.run();
  }

  // Single instance was created outside of the handleInput so that the debounce is not called multiple times
  debouncedFunction = debounce(this.fetchSuggestion.bind(this), 150);

  async fetchSuggestion() {
    const params = new URLSearchParams();
    params.set('api_key', this.apiKey);
    params.set('experienceKey', this.experienceKey);
    // params.set('verticalKey', this.verticalKey);
    params.set('locale', this.locale);
    params.set('input', `${this.searchSettings.input.toLocaleLowerCase()}`);

    // Encode the autocomplete before constructing the URL
    const url = `${this.urlHref}/${this.accountId}/search/autocomplete?v=${
      this.apiVersion
    }&${params.toString()}`;

    const response = await fetch(url);
    const suggestions: ResponseSearchSuggestions = await response.json();
    console.log(suggestions);
    // this.searchSuggestions = suggestions.response.results.slice(
    //   0,
    //   this.showResults
    // );
    this.isFocus = this.searchSuggestions.length > 0;
  }

  handleInput(e: InputEvent) {
    e.preventDefault;
    this.searchSettings.input = (e.target as HTMLInputElement).value;
    if (this.searchSettings.input.length > 3) {
      this.debouncedFunction();
    } else {
      this.cleanSearchSuggestions();
    }
  }

  _focusIn() {
    if (
      this.searchSettings.input.length > 3 &&
      this.searchSuggestions.length > 0
    ) {
      this.isFocus = true;
    }
  }
  _focusOut(e: FocusEvent) {
    const currentTarget = e.currentTarget as Node;
    const relatedTarget = e.relatedTarget as Node;
    if (relatedTarget === null) {
      this.isFocus = false;
    }

    if (!!relatedTarget && !currentTarget.contains(relatedTarget)) {
      this.isFocus = false;
    }
  }

  searchBarTemplate(): TemplateResult {
    const isMobile = ifDefined(
      this.resizeController.currentBreakpointRange === 0
    );

    return html`
      <outline-container-baseline class="${isMobile ? 'isMobile' : null}">
        <div class="search-hero ${isMobile ? 'isMobile' : 'isDesktop'}">
          <outline-heading-baseline level-size="2xl">
            <h1>${this.pageTitle}</h1>
          </outline-heading-baseline>

          <div
            class="exposed-filters"
            @focusout="${(e: FocusEvent) => this._focusOut(e)}"
          >
            <outline-form-baseline form-type="search">
              <form
                action="/search"
                method="get"
                id="views-exposed-form-search-search-page"
                accept-charset="UTF-8"
              >
                <div
                  class="js-form-item form-item js-form-type-textfield form-item-text js-form-item-text"
                >
                  <label
                    for="edit-search-api-fulltext"
                    class="form-item__label font-body"
                    >Keyword</label
                  >
                  <input
                    placeholder="Location name, services, specialty, city, zip code"
                    type="text"
                    id="edit-search-api-fulltext"
                    name="field_keyword"
                    .value=${this.searchSettings.input}
                    @input=${this.handleInput}
                    @focus="${this._focusIn}"
                    maxlength="128"
                    class="form-text form-element form-element--type-text form-element--api-textfield"
                  />
                </div>
                <div
                  data-drupal-selector="edit-actions"
                  class="form-actions js-form-wrapper form-wrapper"
                >
                  <button
                    class="btn btn--search btn--small form-submit"
                    data-drupal-selector="edit-submit"
                    type="submit"
                    id="edit-submit"
                    value="Search"
                    @click=${(e: Event) => this.search(e)}
                  >
                    <span>Search</span>
                  </button>
                </div>
              </form>
            </outline-form-baseline>
            <ul
              aria-live="polite"
              class="${this.isFocus
                ? 'open-suggestion'
                : 'close-suggestion'} suggested-list"
            >
              <li class="suggested-title">Suggested Searches</li>
              ${this.searchSuggestions.length > 0
                ? this.searchSuggestions.map(
                    (suggestion) => html`<li>
                      <button
                        type="button"
                        @click="${() => this.handleSuggestion(suggestion)}"
                      >
                        ${unsafeHTML(
                          this.highlightWord(
                            suggestion.value,
                            this.searchSettings.input
                          )
                        )}
                      </button>
                    </li> `
                  )
                : undefined}
            </ul>
          </div>
        </div>
      </outline-container-baseline>
    `;
  }

  highlightWord(string: string, words: string) {
    const regex = new RegExp(words, 'gi');
    return string.replace(regex, function (str) {
      return '<span class="suggestion-highlight">' + str + '</span>';
    });
  }

  handleSuggestion(suggestion: Result) {
    this.searchSettings.input = suggestion.value;
    this.fetchEndpoint.run();
    this.cleanSearchSuggestions();
  }

  searchVerticalNavTemplate(response: UniversalSearchResponse): TemplateResult {
    return html`
      <div class="search-verticals-nav">
        <h2>Refine Your Search</h2>
        <ul class="">
          <li
            class="vertical vertical--all ${this.activeVertical == 'all'
              ? 'active'
              : ''}"
          >
            <button
              @click="${() => {
                this.activeVertical = 'all';
              }}"
            >
              All (${this.sumResultsCount(response)})
            </button>
          </li>
          ${repeat(
            response.modules,
            (result: Module) => result,
            (result) => html`
              <li
                class="vertical ${this.activeVertical ===
                result.verticalConfigId
                  ? 'active'
                  : ''}"
              >
                <button
                  @click="${() => {
                    this.activeVertical = result.verticalConfigId;
                  }}"
                >
                  ${result.verticalConfigId} (${result.resultsCount})
                </button>
              </li>
            `
          )}
        </ul>
      </div>
    `;
  }

  mobileCloseModalTemplate() {
    return this.modalFiltersOpenClose
      ? html`<button
          type="button"
          id="closeModal"
          class="menu-dropdown-close"
          aria-expanded="${this.modalFiltersOpenClose}"
          aria-controls="slider-modal"
          @click=${this.toggleFilterModal}
        >
          <outline-icon-baseline
            name="close"
            aria-hidden="true"
          ></outline-icon-baseline>
          <span class="visually-hidden">Close modal filters</span>
        </button>`
      : null;
  }

  mobileStickyCTATemplate() {
    return this.modalFiltersOpenClose
      ? html`<div class="container-cta-sticky">
          <button
            class="reset-search"
            type="button"
            @click=${(e: Event) => this.reset(e)}
          >
            Clear
          </button>
          <button
            type="button"
            id="close-modal-mobile"
            class="close-modal-mobile btn btn--default btn--small"
            aria-expanded="${this.modalFiltersOpenClose}"
            aria-controls="slider-modal"
            @click=${this.toggleFilterModal}
          >
            Show ${this.totalCount} results

            <outline-icon-baseline
              name="arrowRight"
              size="1.25rem"
            ></outline-icon-baseline>
          </button>
        </div>`
      : null;
  }

  toggleFilterModal() {
    this.modalFiltersOpenClose = !this.modalFiltersOpenClose;
    if (this.modalFiltersOpenClose) {
      document.querySelector('body')!.style.overflow = 'hidden';
      this._trapKeyboardMobileMenu = this._trapKeyboardMobileMenu.bind(this);
      document.addEventListener('keydown', this._trapKeyboardMobileMenu);
    } else {
      document.querySelector('body')!.style.overflow = 'revert';
      document.removeEventListener('keydown', this._trapKeyboardMobileMenu);
      this.backToFocusElementCloseFilter();
    }

    this.focusCloseButton();
  }

  backToFocusElementCloseFilter() {
    const openButtonModal = this.shadowRoot?.querySelector(
      '#openModal'
    ) as HTMLButtonElement;
    if (openButtonModal) {
      openButtonModal?.focus();
    }
  }

  focusCloseButton() {
    setTimeout(() => {
      const closeButtonRef = this.shadowRoot
        ?.querySelector('#slider-modal')
        ?.querySelector('.menu-dropdown-close') as HTMLButtonElement;
      if (closeButtonRef) {
        closeButtonRef?.focus();
      }
    }, 300);
  }

  _trapKeyboardMobileMenu(event: KeyboardEvent) {
    // Get all focusable elements in the Modal
    const focusableElements =
      this.shadowRoot!.querySelector(
        '#slider-modal'
      )?.querySelectorAll<HTMLElement>('button, summary');
    if (!focusableElements) {
      return;
    }
    const firstFocusableElement = focusableElements[0];
    const lastFocusableElement =
      focusableElements[focusableElements.length - 1];

    if (event.key === 'Tab') {
      if (event.shiftKey) {
        if (
          document.activeElement?.shadowRoot?.activeElement?.matches(
            `#${lastFocusableElement.id}`
          )
        ) {
          return;
        }
        if (
          document.activeElement?.shadowRoot?.activeElement?.matches(
            `#${firstFocusableElement.id}`
          )
        ) {
          lastFocusableElement.focus();
          event.preventDefault();
          return;
        }
      }

      if (
        document.activeElement?.shadowRoot?.activeElement?.matches(
          `#${lastFocusableElement.id}`
        )
      ) {
        firstFocusableElement.focus();
        event.preventDefault();
        return;
      }
    }
  }

  render(): TemplateResult {
    if (this.fetchEndpoint.value !== undefined) {
      this.taskValue = this.fetchEndpoint.value;
    }
    const classes = {
      wrapper: true,
      isMobile: this.resizeController.currentBreakpointRange === 0,
    };

    return html`
      ${this.activeVertical !== 'all'
        ? html`
            <outline-yext vertical-key="${this.activeVertical}"></outline-yext>
          `
        : html`
            ${this.searchBarTemplate()}
            <outline-container-baseline>
              <div class="${classMap(classes)}"></div>
              ${this.fetchEndpoint.render({
                pending: () =>
                  this.taskValue ? this.displayPending() : noChange,
                complete: (data) =>
                  this.searchVerticalNavTemplate(data.response),
                error: (error) => html`${error}`,
              })}

              <main>
                ${this.fetchEndpoint.render({
                  pending: () =>
                    this.taskValue ? this.displayPending() : noChange,
                  complete: (data) => this.displayAll(data.response),
                  error: (error) => html`${error}`,
                })}
                ${this.totalCount
                  ? html`
                      <outline-yext-pager
                        current-page=${this.searchSettings.offset /
                          this.searchSettings.limit +
                        1}
                        total-pages=${Math.ceil(
                          this.totalCount / this.searchSettings.limit
                        )}
                        @click=${(e: Event) => this.handlePageChange(e)}
                        aria-live="polite"
                      ></outline-yext-pager>
                    `
                  : null}
              </main>
            </outline-container-baseline>
          `}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'outline-yext-universal': OutlineYextUniversal;
  }
}
