import { LitElement, html, noChange, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';

import { classMap } from 'lit/directives/class-map.js';
// import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { Task } from '@lit/task';
import { AdoptedStylesheets } from '@phase2/outline-adopted-stylesheets-controller';
import componentStyles from './outline-yext-vertical.css?inline';
import { ResizeController } from '../../controllers/resize-controller';
import '../outline-yext-pager/outline-yext-pager';
import { displayTeaser } from './teaser';

import type {
  SearchSettings,
  Result,
  VerticalSearchResponseStructure,
} from '../outline-yext-universal/outline-yext-types';

/**
 * The Yext Vertical Search component.
 * @element outline-yext-universal
 */
@customElement('outline-yext-vertical')
export class OutlineYextVertical extends LitElement {
  createRenderRoot() {
    const root = super.createRenderRoot();
    // this.EncapsulatedStylesheets = this.shadowRoot
    //   ? new AdoptedStylesheets(this, componentStyles, this.shadowRoot)
    //   : undefined;
    new AdoptedStylesheets(this, componentStyles, this.shadowRoot!);
    return root;
  }

  urlHref = 'https://cdn.yextapis.com/v2/accounts';
  accountId = 'me';
  contentType = 'search/vertical/query';
  apiKey = '0f3c031ce836961cf921558aca570af3';
  apiVersion = '20230406';
  apiVersionEntities = '20230301';
  version = 'PRODUCTION';
  locale = 'en';
  sortBys = 'relevance';
  pageTitle = '';
  experienceKey = 'universal-search';

  defaultSearchSettings: SearchSettings = {
    input: '',
    offset: 0,
    limit: 16,
    facetFilters: {},
  };

  searchSettings: SearchSettings = structuredClone(this.defaultSearchSettings);

  fields = 'firstName,lastName,data.id';
  requestUrlBase = `${this.urlHref}/${this.accountId}/${this.contentType}`;

  totalCount?: null | number;
  randomizationToken?: null | string;

  filterTempProfiles = false;

  @property({ type: String, attribute: 'vertical-key' })
  verticalKey = 'blog';

  // @property({ type: Boolean, reflect: true, attribute: 'debug' })
  // debug: null;

  @property({ type: Number, reflect: true, attribute: 'show-results' })
  showResults = 5;

  userLat?: number;
  userLong?: number;

  requestURL?: string;
  lastFetchTime?: null | number;

  @state() isFocus = false;

  @state()
  entities?: [];

  @state()
  searchSuggestions: Result[] = [];

  @state() modalFiltersOpenClose = false;

  @state() searchFacetValues?: {
    [key: string]: string;
  };

  taskValue: unknown;

  connectedCallback() {
    super.connectedCallback();
    this.readParamsFromUrl();
    this.pageTitle = this.verticalKey || '';
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
    // params.set('api_key', this.apiKey);
    staticParams.set('v', this.apiVersion);
    staticParams.set('api_key', this.apiKey);
    staticParams.set('experienceKey', this.experienceKey);
    staticParams.set('verticalKey', this.verticalKey || '');
    staticParams.set('version', this.version);
    staticParams.set('locale', this.locale);
    dynamicParams.set('retrieveFacets', 'true');
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

    this.requestURL = `${
      this.requestUrlBase
    }?${staticParams.toString()}&${dynamicParams.toString()}`;
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

    keysToDelete.forEach(key => {
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

  rawFilters?: {};

  fetchEndpoint = new Task(
    this,
    async () => {
      const startTime = performance.now();
      this.prepareRequestURL();

      if (!this.requestURL) return;

      const response = await fetch(this.requestURL, {});
      const jsonResponse: {
        meta: {};
        response: VerticalSearchResponseStructure;
      } = await response.json();

      this.totalCount = jsonResponse.response.resultsCount;

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

  // from https://hitchhikers.yext.com/docs/contentdeliveryapis/search/verticalsearch
  displayTotalCountTemplate() {
    if (this.totalCount) {
      const range1 = this.searchSettings.offset + 1;
      const range2 = Math.min(
        this.searchSettings.offset + this.searchSettings.limit,
        this.totalCount
      );
      return html`<div class="total-count">
        Showing <strong>${range1}-${range2}</strong> of ${this.totalCount}
        results
      </div>`;
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

  displayAll(response: VerticalSearchResponseStructure) {
    if (response.resultsCount === 0) {
      return html` <h2>No results found</h2> `;
    }

    // this.randomizationToken = response.randomizationToken;
    // this.userLat = Number(response.locationBias?.latitude);
    // this.userLong = Number(response.locationBias?.longitude);

    return html`
      <ul class="results-list">
        ${repeat(
          response.results,
          result => result,
          (result, index) => html`
            <li class="result" data-index=${index}>
              ${displayTeaser(this.verticalKey, result)}
            </li>
          `
        )}
      </ul>
    `;
  }

  debugTemplate(data: {}): TemplateResult {
    return html`
      <details class="debug">
        <summary></summary>
        <div>
          <pre>${JSON.stringify(data, null, 2)}</pre>
        </div>
      </details>
    `;
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

  render(): TemplateResult {
    if (this.fetchEndpoint.value !== undefined) {
      this.taskValue = this.fetchEndpoint.value;
    }

    const classes = {
      wrapper: true,
      isMobile: this.resizeController.currentBreakpointRange === 0,
    };

    return html`
      <div>
        <div class="${classMap(classes)}">
          <main>
            ${this.displayTotalCountTemplate()}
            ${this.fetchEndpoint.render({
              pending: () =>
                this.taskValue ? this.displayPending() : noChange,
              complete: data => data && this.displayAll(data.response),
              error: error => html`${error}`,
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
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'outline-yext-vertical': OutlineYextVertical;
  }
}
