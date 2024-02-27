import {
  LitElement,
  CSSResultGroup,
  html,
  noChange,
  TemplateResult,
} from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { classMap } from 'lit/directives/class-map.js';
// import { OutlineElement } from '../../base/outline-element/outline-element';
import { defaultImageTemplate } from './image-template';
import { Task } from '@lit/task';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
// import componentStyles from './outline-yext.css.lit';
// import StyleOutlineButton from '../outline-button/outline-button.css.lit';
// import '../outline-yext-item/outline-yext-item';
// import '../outline-pager/outline-pager';
import { ResizeController } from '../../controllers/resize-controller';
import { debounce } from '../../utilities/debounce';
import type {
  SearchSettings,
  verticalSearchResponseStructure,
  HealthcareProfessional,
  SubQueryParam,
  ResponseSearchSuggestions,
  Result,
  // RatingResponse,
} from './outline-yext-types';
import { deleteDuplicateProfiles, formatPhone } from './outline-yext-format';

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

/**
 * The Yext component.
 * @element outline-yext
 */

@customElement('outline-yext')
export class OutlineYext extends LitElement {
  // static styles: CSSResultGroup = [StyleOutlineButton, componentStyles];
  urlHref = 'https://cdn.yextapis.com/v2/accounts';
  accountId = 'me';
  // contentType = 'answers/vertical/query';
  contentType = 'search/vertical/query';
  apiKey = '0f3c031ce836961cf921558aca570af3';
  apiVersion = '20230406';
  apiVersionEntities = '20230301';
  experienceKey = 'universal-search';
  // verticalKey = 'blog';
  version = 'PRODUCTION';
  locale = 'en';
  sortBys = 'relevance';
  @property({ type: String, reflect: true, attribute: 'title-page' })
  defaultSearchSettings: SearchSettings = {
    input: '',
    offset: 0,
    limit: 16,
    facetFilters: {},
  };

  searchSettings: SearchSettings = structuredClone(this.defaultSearchSettings);

  fields = 'firstName,lastName,data.id';
  requestUrlBase = `${this.urlHref}/${this.accountId}/${this.contentType}`;

  @property()
  totalCount: null | number;
  randomizationToken: null | string;

  filterTempProfiles = false;

  @property({ type: Boolean, reflect: true, attribute: 'debug' })
  debug: null;

  @property({ type: Number, reflect: true, attribute: 'show-results' })
  showResults = 5;

  userLat: number;
  userLong: number;

  requestURL: string;
  lastFetchTime: null | number;

  @state() isFocus = false;

  @state()
  entities: [];

  @state()
  searchSuggestions: Result[] = [];

  @state() modalFiltersOpenClose = false;

  @state() searchFacetValues: {
    [key: string]: string;
  };

  taskValue: unknown;
  resizeController = new ResizeController(this, {});
  scrollTimeout: NodeJS.Timeout | undefined;

  connectedCallback() {
    super.connectedCallback();
    this.readParamsFromUrl();
  }

  handlePageChange(event: Event) {
    const pageClicked = (event.target as HTMLElement).getAttribute(
      'current-page'
    );
    // Check if pageClicked is not null and is a valid number
    if (pageClicked !== null && !isNaN(Number(pageClicked))) {
      const offset = (Number(pageClicked) - 1) * this.searchSettings.limit;
      this.searchSettings.offset = offset;
      this.fetchEndpoint.run();
      this.scrollToTopPageAndFocusFilters();
    }
  }
  scrollToTopPageAndFocusFilters() {
    // Clear any previous timeout
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    // Set a new timeout for scrolling
    this.scrollTimeout = setTimeout(() => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });

      // Find the element with the class .profiles-list
      const profilesList = this.shadowRoot?.querySelector(
        '.profiles-list'
      ) as HTMLUListElement;

      // Check if an element with the class .profiles-list was found
      if (profilesList) {
        // Focus on the first element
        profilesList.focus();
      }
    }, 1000);
  }

  prepareRequestURL() {
    const staticParams = new URLSearchParams();
    const dynamicParams = new URLSearchParams();
    // params.set('api_key', this.apiKey);
    staticParams.set('v', this.apiVersion);
    staticParams.set('api_key', this.apiKey);
    staticParams.set('experienceKey', this.experienceKey);
    staticParams.set('verticalKey', this.verticalKey);
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
        if (key === 'input') {
          dynamicParams.set(key, value as string);
        } else {
          dynamicParams.set(key, JSON.stringify(value));
        }
      } else {
        dynamicParams.delete(key);
      }
    }

    this.updateUrlWithSearchSettings(dynamicParams);

    this.requestURL = `${
      this.requestUrlBase
    }?${staticParams.toString()}&${dynamicParams.toString()}`;
  }

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

  rawFilters: {};

  fetchEndpoint = new Task(
    this,
    async () => {
      const startTime = performance.now();
      this.prepareRequestURL();
      const response = await fetch(this.requestURL, {});
      const jsonResponse: {
        meta: {};
        response: verticalSearchResponseStructure;
      } = await response.json();
      this.totalCount = jsonResponse.response.resultsCount;

      const endTime = performance.now();
      this.lastFetchTime = (endTime - startTime) / 1000;

      const jsonResponseClean = this.CleanDuplicateProfiles(jsonResponse);
      this.sortOrderSpecialties(jsonResponse);

      this.customSearchPiwik(jsonResponseClean);

      return jsonResponseClean;
    },
    () => [this.entities]
  );

  customSearchPiwik(results: {
    meta: {};
    response: verticalSearchResponseStructure;
  }) {
    const urlLocation = window.location;
    const params = new URLSearchParams(window.location.search);

    // Initialize the data layer if it doesn't exist
    window.dataLayer = window.dataLayer || [];

    // Set up the default data layer object
    const defaultLayer = {
      event: 'custom.searchResults',
      pageURL: urlLocation.href,
      pagePath: urlLocation.pathname,
      pageTitle: document.title,
      pageReferrer: urlLocation.origin,
      searchParameter: 'yext_input',
      searchTerm: params.get('yext_input') || '',
      searchFilter: '',
      searchIndex: 'doctor',
      searchFailed: this.totalCount === 0,
    };

    const searchFilter = results.response.facets.flatMap((facet) =>
      facet.options
        .filter((option) => option.selected)
        .map((option) => option.displayName)
    );
    if (searchFilter.length > 0) {
      defaultLayer.searchFilter = searchFilter.join(', ');
    }

    // Push the default layer to the data layer
    window.dataLayer.push(defaultLayer);
  }

  sortOrderSpecialties(jsonResponse: {
    meta: {};
    response: verticalSearchResponseStructure;
  }) {
    jsonResponse.response.facets.forEach((facet) => {
      facet.options.sort((a, b) =>
        a.displayName.toLowerCase().localeCompare(b.displayName.toLowerCase())
      );
    });
  }

  CleanDuplicateProfiles(jsonResponse: {
    meta: {};
    response: verticalSearchResponseStructure;
  }) {
    // Remove duplicate profiles based on specific criteria
    const cleanData = deleteDuplicateProfiles(jsonResponse);
    // Fetch additional data and update profiles if necessary
    this.fetchAdditionalProfileLocations(cleanData);

    return cleanData;
  }

  async fetchAdditionalProfileLocations(jsonResponse: {
    meta: {};
    response: verticalSearchResponseStructure;
  }) {
    // Extract the results from the JSON response
    const searchResults = jsonResponse.response.results;

    // Create an array of promises for each result
    const promises = searchResults.map(async (searchResult) => {
      // Check if there are additional profiles
      if (searchResult.data.c_additionalProfiles?.length > 0) {
        // Iterate over each additional profile
        for (const additionalProfile of searchResult.data
          .c_additionalProfiles) {
          try {
            const params = new URLSearchParams();
            params.set('api_key', this.apiKey);
            params.set('v', this.apiVersionEntities);

            // Encode the profile's entityId before constructing the URL
            const encodedId = encodeURIComponent(additionalProfile.entityId);
            const url = `${this.urlHref}/${
              this.accountId
            }/entities/${encodedId}?${params.toString()}`;

            // Fetch the additional profile's data from the URL
            const response = await fetch(url);
            const additionalProfileData = await response.json();
            // Update the office name and complement of the additional profile
            additionalProfile.phoneNumber =
              additionalProfileData.response.mainPhone;
            additionalProfile.officeName =
              additionalProfileData.response.officeName;
            additionalProfile.complement = additionalProfileData.response
              .address
              ? `${additionalProfileData.response.address.line1} ${additionalProfileData.response.address.city}, ${additionalProfileData.response.address.region} ${additionalProfileData.response.address.postalCode}`
              : '';
          } catch (error) {
            console.error('Error fetching additional profile data:', error);
          }
        }
      }

      // if (searchResult.data.npi) {
      //   try {
      //     // Construct the URL for the rating API
      //     const ratingResponse = await fetch(
      //       `https://ratings.md/api/v1/widget/profiles/${searchResult.data.npi}?account=outline-medicine&id_type=npi`
      //     );

      //     // Parse the JSON response into a RatingResponse object
      //     const ratingData: RatingResponse = await ratingResponse.json();

      //     // If the ratingData contains a message, it indicates an error, so return early
      //     if (ratingData.message) {
      //       return;
      //     } else {
      //       // If there was no error, update the ratings data on the search result
      //       searchResult.data.ratings = `<span><strong>${ratingData.rating}</strong> (${ratingData.comment_count} reviews)<span>`;
      //     }
      //   } catch (error) {
      //     console.error('Error fetching rating data:', error);
      //   }
      // }
    });

    // Wait for all promises to resolve
    await Promise.all(promises);
    // Request an update to the component to reflect the new data
    this.requestUpdate();
  }

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

    // this.shadowRoot!.querySelector('outline-yext-item')!.refresh();
  }

  // from https://hitchhikers.yext.com/docs/contentdeliveryapis/search/verticalsearch

  displayTotalCount() {
    if (this.totalCount) {
      const range1 = this.searchSettings.offset + 1;
      const range2 = Math.min(
        this.searchSettings.offset + this.searchSettings.limit,
        this.totalCount
      );
      return html` ${range1}-${range2} of ${this.totalCount} results `;
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

  /**
   *
   * @param response
   *
   * This code displays the facets in the response. The displayFacets function
   * takes a response as a parameter. It gets the facets from the response, and
   * then creates an array of options that map to the facets. It then returns
   * a button that has the name of the facet, along with the number of results
   * in the facet. When a user clicks on the button, it calls the selectFacet
   * function, which is not shown here. The selectFacet function takes a facet
   * as a parameter.
   */

  displayFacets(response: verticalSearchResponseStructure) {
    if (!response.facets) return;

    const binaryFacets: verticalSearchResponseStructure['facets'] = [];
    const multiFacets: verticalSearchResponseStructure['facets'] = [];

    response.facets.forEach((facet) => {
      if (facet.options.length > 0) {
        if (
          facet.options[0].displayName === 'true' ||
          facet.options[0].displayName === 'false'
        ) {
          binaryFacets.push(facet);
        } else {
          multiFacets.push(facet);
        }
      }
    });

    const facetsTriggers = [
      'c_hospitalAffiliations',
      'c_specialtyFAD.name',
      'officeName',
    ];
    multiFacets.map((facet) => {
      if (
        facet.fieldId === 'c_specialtyFAD.name' &&
        facet.displayName.includes('Name')
      ) {
        facet.displayName = facet.displayName.replace('Name', '');
      }
    });
    const displayOfficeNameFacet = multiFacets.find((facet) => {
      return (
        facetsTriggers.includes(facet.fieldId) &&
        facet.options.some((option) => option.selected)
      );
    });

    if (this.searchFacetValues === undefined) {
      multiFacets.map(
        (facet) =>
          (this.searchFacetValues = {
            ...this.searchFacetValues,
            [facet.displayName]: '',
          })
      );
    }

    const filteredFacets: verticalSearchResponseStructure['facets'] =
      multiFacets.map((facet) => {
        // Filter the options of each facet based on a condition
        const filteredOptions = facet.options.filter((option) =>
          option.displayName
            .toLowerCase()
            .includes(this.getSearchFacetValue(facet.displayName).toLowerCase())
        );
        // Return a new object with the filtered options
        return {
          ...facet,
          options: filteredOptions,
        };
      });

    return html`
      <form action="#">
        <fieldset aria-live="polite">
          ${repeat(filteredFacets, (facet, index) => {
            const originalReference = multiFacets[index];
            const someOptionsSelected = originalReference.options.some(
              (option) => option.selected
            );

            return html`
              <details
                ?open=${someOptionsSelected}
                data-index=${index}
                ?hidden=${facet.fieldId ===
                  'c_specialtyFAD.c_relatedSubspecialties.name' ||
                (facet.fieldId === 'officeName' && !displayOfficeNameFacet)}
              >
                <summary>${facet.displayName}</summary>
                <ul>
                  ${originalReference.options.length > 5
                    ? html`<div class="search-facets">
                        ${this.getSearchInputs(facet.displayName)}
                      </div>`
                    : null}
                  ${repeat(
                    facet.options,
                    (option) => option,
                    (option, index) => {
                      const idWithSpaces =
                        facet.displayName + `-` + option.displayName;
                      const id = idWithSpaces.replace(/\s/g, '_');
                      return html`
                        <li data-index=${index}>
                          <input
                            type="checkbox"
                            id=${id}
                            ?checked=${ifDefined(option.selected)}
                            @click=${(e: Event) =>
                              this.setFacets(e, option.filter)}
                          />
                          <label for=${id}>
                            ${unsafeHTML(
                              this.highlightWord(
                                option.displayName,
                                this.getSearchFacetValue(
                                  facet.displayName
                                ).toLowerCase()
                              )
                            )}
                            (${option.count})
                          </label>
                        </li>
                      `;
                    }
                  )}
                </ul>
              </details>
            `;
          })}
          ${binaryFacets.length > 0
            ? html` <p class="legend">Additional preferences</p> `
            : undefined}
          <ul class="checkbox-container">
            ${binaryFacets.map((facet) => {
              return html`
                ${repeat(
                  facet.options,
                  (option) => option,
                  (option, index) => {
                    if (option.displayName === 'false') {
                      return;
                    }
                    const idWithSpaces =
                      facet.displayName + `-` + option.displayName;
                    const id = idWithSpaces.replace(/\s/g, '_');
                    return html`
                      <li data-index=${index}>
                        <label class="toggle" for=${id}>
                          <input
                            type="checkbox"
                            class="toggle__input visually-hidden"
                            id=${id}
                            ?checked=${ifDefined(option.selected)}
                            @click=${(e: Event) =>
                              this.setFacets(e, option.filter)}
                          />
                          <span class="toggle-track">
                            <span class="toggle-indicator"> </span>
                          </span>
                          ${facet.displayName}
                        </label>
                      </li>
                    `;
                  }
                )}
              `;
            })}
          </ul>
        </fieldset>
      </form>
    `;
  }

  getSearchFacetValue(facetName: string): string {
    return this.searchFacetValues[facetName] || '';
  }

  handleSearchFacets(event: Event, facetName: string) {
    const inputElement = event.target as HTMLInputElement;

    this.searchFacetValues = {
      ...this.searchFacetValues,
      [facetName]: inputElement.value,
    };
  }

  getSearchInputs(facetName: string) {
    return html`
      <input
        type="text"
        id="search-${facetName}"
        value=""
        @input=${(e: Event) => this.handleSearchFacets(e, facetName)}
        placeholder="Search ${facetName.toLowerCase()}"
      />
    `;
  }

  displayFilterPill(
    facets: verticalSearchResponseStructure['facets'],
    parentAsLabel: Boolean
  ) {
    return facets.map((facet) => {
      return facet.options.map((option) => {
        if (!option.selected) return;
        const idWithSpaces = facet.displayName + `-` + option.displayName;
        const id = idWithSpaces.replace(/\s/g, '_');
        return html`<li class="filter-option">
          <button
            type="button"
            class="btn compact medium"
            id=${`button-${id}`}
            @click=${(e: Event) => {
              // option.selected = false;
              this.setFacets(e, option.filter, true);
            }}
          >
            <span class="visually-hidden">Unselect</span>
            ${parentAsLabel ? option.displayName : facet.displayName}
            <span class="visually-hidden">filter</span>
            <outline-icon
              name="close"
              library="system"
              size="1.5rem"
              class="remove-filter-icon"
              aria-hidden="true"
            ></outline-icon>
          </button>
        </li>`;
      });
    });
  }

  displayFacetsActive(response: verticalSearchResponseStructure) {
    if (!response.facets) return;
    const binaryFacets: verticalSearchResponseStructure['facets'] = [];
    const multiFacets: verticalSearchResponseStructure['facets'] = [];

    response.facets.forEach((facet) => {
      if (facet.options.length > 0) {
        if (
          facet.options[0].displayName === 'true' ||
          facet.options[0].displayName === 'false'
        ) {
          binaryFacets.push(facet);
        } else {
          multiFacets.push(facet);
        }
      }
    });

    return html`
      ${this.displayFilterPill(multiFacets, true)}
      ${this.displayFilterPill(binaryFacets, false)}
    `;
  }

  /**
   * The setFacets function is used to set the facet filters on the search settings.
   * It is called when the user clicks on one of the facet checkboxes.
   * It takes two arguments: an event object, and a filter object.
   * The event object is the event that triggered the function, and the filter
   * object is the filter that the user clicked on. The function checks to see
   * if the checkbox is checked, and if it is, it adds the filter to the search
   * settings. If the checkbox is not checked, the function removes the filter
   * from the search settings. The function then calls the fetch endpoint function.
   */

  setFacets(
    e: Event,
    filter: SubQueryParam,
    forceRemoveFilter: Boolean = false
  ) {
    // Get the checkbox element
    const inputElement = e.target as HTMLInputElement;

    // Get the current facet filters
    const facetFilters = this.searchSettings.facetFilters;
    if (Object.keys(facetFilters).length === 0) {
      if (inputElement.checked === false) {
        // Filter was applied by Yext and not by the user, do not remove the filter
        inputElement.checked = true;
        return;
      }
      if (forceRemoveFilter) {
        return;
      }
    }

    // Get the key (i.e. "gender") and value (i.e. "Female") from the filter
    const key = Object.keys(filter)[0];
    const value = filter[`${key}`].$eq;

    // Get the checked state of the checkbox
    const selected = inputElement.checked;

    // If the checkbox is checked, add the filter to the list of facet filters
    if (selected && !forceRemoveFilter) {
      if (!facetFilters[`${key}`]) {
        facetFilters[`${key}`] = [];
      }
      facetFilters[`${key}`].push(filter);
    } else {
      // If the checkbox is unchecked, remove the filter from the list of facet filters
      // (if it's the last filter for that facet, remove the facet)
      const indexToDelete = facetFilters[`${key}`].findIndex(
        (item) => item[`${key}`].$eq === value
      );
      facetFilters[`${key}`].splice(indexToDelete, 1);
      if (Object.keys(facetFilters[`${key}`]).length === 0) {
        delete facetFilters[`${key}`];
      }
      // Manually uncheck the checkbox
      if (forceRemoveFilter) {
        let element = e.target as HTMLElement;
        if (element.tagName === 'OUTLINE-ICON') {
          // The icon was clicked, get the button element
          element = element.closest('button') as HTMLButtonElement;
        }
        const id = element.id.replace('button-', '');
        const equivelantInputElement = this.shadowRoot
          ?.querySelector('aside')
          ?.querySelector(`input#${id}`) as HTMLInputElement;
        if (equivelantInputElement) {
          equivelantInputElement.checked = false;
        }
      }
    }
    this.searchSettings.offset = 0;
    // Run the fetchEndpoint function to refresh the results
    this.fetchEndpoint.run();
  }

  displayAll(response: verticalSearchResponseStructure) {
    if (response.resultsCount === 0) {
      return html` <h2>No results found</h2> `;
    }

    // this.randomizationToken = response.randomizationToken;
    this.userLat = Number(response.locationBias.latitude);
    this.userLong = Number(response.locationBias.longitude);

    return html`
      <ul class="profiles-list" aria-live="polite">
        ${repeat(
          response.results,
          (result) => result,
          (result, index) => html`
            <li class="list-separator" aria-hidden="true">
              <hr />
            </li>
            <li class="profile">
              ${this.profileTemplate(
                result.data as HealthcareProfessional,
                index,
                result.distance
              )}
            </li>
          `
        )}
      </ul>
    `;
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

  redirectionProfileDebug(data: HealthcareProfessional): string {
    if (this.debug) {
      return `/?path=/story/content-yext-yext-item--outline-yext-item&yext=${data.c_url_id}`;
    } else {
      return `/doctor/${data.c_url_id}`;
    }
  }

  handleSubSpecialty(data: HealthcareProfessional, specialtyName: string) {
    let joinSpecialtyAndSub: string[] = [];
    if (Array.isArray(specialtyName)) {
      // If specialtyName is an array, concatenate it with c_specialtyName
      joinSpecialtyAndSub = data.c_specialtyName.concat(specialtyName);
    } else {
      // If specialtyName is a string, split it by commas and concatenate with c_specialtyName
      joinSpecialtyAndSub = data.c_specialtyName.concat(
        specialtyName.split(',')
      );
    }
    return joinSpecialtyAndSub;
  }

  profileTemplate(
    data: HealthcareProfessional,
    index: number,
    distance: number
  ): TemplateResult | null {
    const convertMetersToMiles = (meter: number) => {
      const feet = meter * 3.28084; // convert meter to feet
      const miles = feet / 5280; // convert feet to miles
      return miles;
    };
    // Hide/Display "temp" / unfinished profiles
    if (this.filterTempProfiles) {
      if (data.id.startsWith('Temp-')) {
        return html`.`;
      }
    }

    const profileDetailsUrl = this.redirectionProfileDebug(data);
    const addressString = data.address
      ? `${data.address.line1} ${data.address.city}, ${data.address.region} ${data.address.postalCode}`
      : null;
    const formattedMainPhone = formatPhone(data.mainPhone);
    const hiddenValue = false;

    // This logic was created to be able to unite the specialties and subspecialties and take only the first 3,
    // we do not know if YEXT is going to send us a new field (c_subSpecialtyDisplayName)
    // because right now it has a temporary (c_subSpecialtyDisplayName_Temporary),
    // so we do not know if it is a string or an array, that's why we are creating all this logic,
    // to be able to prevent any error because we don't know for sure what they are going to send us and in what format.
    let subSpecialty = '';
    let joinSpecialtyAndSub: string[] = [];
    if (data.c_specialtyName) {
      if (data.c_subSpecialtyDisplayName) {
        joinSpecialtyAndSub = this.handleSubSpecialty(
          data,
          data.c_subSpecialtyDisplayName
        );
      } else if (data.c_subSpecialtyDisplayName_Temporary) {
        joinSpecialtyAndSub = this.handleSubSpecialty(
          data,
          data.c_subSpecialtyDisplayName_Temporary
        );
      }
      // take only the first 3
      subSpecialty = joinSpecialtyAndSub.splice(0, 3).join(', ');
    }

    let expertiseShow: string[] = [];
    let expertiseHidden: string[] = [];

    if (data.c_expertise) {
      expertiseShow = data.c_expertise.slice(0, 3);
      expertiseHidden = data.c_expertise.slice(3);
    }

    return html`
      ${this.debug
        ? html` <details class="debug">
            <summary></summary>
            <div>
              <pre>${JSON.stringify(data, null, 2)}</pre>
            </div>
          </details>`
        : null}
      <outline-card-provider-listing data-index=${index}>
        <div slot="photo">
          ${data.headshot?.url
            ? html`
                <img
                  src="${ifDefined(data.headshot?.url)}"
                  alt="${ifDefined(data.name)}"
                />
              `
            : defaultImageTemplate()}
        </div>
        ${data.ratings
          ? html` <div slot="reviews">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="M5.825 22L8.15 14.4L2 10H9.6L12 2L14.4 10H22L15.85 14.4L18.175 22L12 17.3L5.825 22Z"
                  fill="#00308C"
                />
              </svg>
              ${unsafeHTML(data.ratings)}
            </div>`
          : null}
        <div slot="name">
          <h4>${data.name}</h4>
        </div>
        <div slot="distance">
          ${Math.round(convertMetersToMiles(distance))} mi
        </div>
        ${data.c_clinicalTitles
          ? html` <div slot="specialty">${data.c_clinicalTitles[0]}</div> `
          : null}
        ${subSpecialty
          ? html` <div slot="subspecialty">${subSpecialty}</div> `
          : null}
        ${expertiseShow.length > 0
          ? html`<div slot="expertise"><strong>Expertise</strong></div>`
          : null}
        ${expertiseShow
          ? repeat(
              expertiseShow,
              (result) => result,
              (result, index) => html`
                <div slot="expertise" data-index=${index}>${result}</div>
              `
            )
          : null}
        ${expertiseHidden
          ? repeat(
              expertiseHidden,
              (res) => res,
              (res, index) => html`
                <div slot="additional-expertise" data-index=${index}>
                  ${res}
                </div>
              `
            )
          : null}
        <div slot="location">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              d="M12 12C12.55 12 13.02 11.8 13.41 11.41C13.8 11.02 14 10.55 14 10C14 9.45 13.8 8.98 13.41 8.59C13.02 8.2 12.55 8 12 8C11.45 8 10.98 8.2 10.59 8.59C10.2 8.98 10 9.45 10 10C10 10.55 10.2 11.02 10.59 11.41C10.98 11.8 11.45 12 12 12ZM12 12C12.55 12 13.02 11.8 13.41 11.41C13.8 11.02 14 10.55 14 10C14 9.45 13.8 8.98 13.41 8.59C13.02 8.2 12.55 8 12 8C11.45 8 10.98 8.2 10.59 8.59C10.2 8.98 10 9.45 10 10C10 10.55 10.2 11.02 10.59 11.41C10.98 11.8 11.45 12 12 12ZM12 12C12.55 12 13.02 11.8 13.41 11.41C13.8 11.02 14 10.55 14 10C14 9.45 13.8 8.98 13.41 8.59C13.02 8.2 12.55 8 12 8C11.45 8 10.98 8.2 10.59 8.59C10.2 8.98 10 9.45 10 10C10 10.55 10.2 11.02 10.59 11.41C10.98 11.8 11.45 12 12 12Z"
              fill="#428FEC"
            />
            <path
              d="M12.0018 22.06L10.6518 20.82C8.47181 18.82 6.88181 17.03 5.80181 15.34C4.59181 13.47 4.01181 11.78 4.01181 10.19C4.00181 7.84 4.78181 5.86 6.32181 4.32C7.86181 2.78 9.77181 2 12.0018 2C14.2318 2 16.1318 2.78 17.6818 4.32C19.2218 5.86 20.0018 7.84 20.0018 10.2C20.0018 11.79 19.4118 13.47 18.2118 15.35C17.1218 17.04 15.5418 18.83 13.3618 20.83L12.0118 22.07L12.0018 22.06ZM12.0018 19.35C14.0218 17.49 15.5518 15.78 16.5218 14.26C17.5018 12.74 18.0018 11.38 18.0018 10.2C18.0018 8.39 17.4218 6.89 16.2618 5.74C15.1018 4.59 13.6718 4 12.0018 4C10.3318 4 8.89181 4.58 7.74181 5.74C6.59181 6.89 6.00181 8.39 6.00181 10.2C6.00181 11.38 6.50181 12.74 7.48181 14.26C8.46181 15.78 9.98181 17.49 12.0018 19.35Z"
              fill="#00308C"
            />
          </svg>
          ${data.officeName
            ? html`<strong>${data.officeName}</strong><br />`
            : null}
          ${addressString
            ? html`
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href="https://www.google.com/maps/search/?api=1&map_action=map&query=${encodeURI(
                    addressString
                  )}"
                >
                  ${addressString}
                </a>
              `
            : null}
        </div>

        ${data.mainPhone
          ? html`
              <div slot="phone">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M18.9922 11.995C18.9922 10.0461 18.3126 8.397 16.9533 7.03776C15.5941 5.67851 13.945 4.99889 11.9961 4.99889V3C13.2454 3 14.4148 3.23987 15.5041 3.70961C16.5935 4.18934 17.543 4.82898 18.3526 5.63853C19.1621 6.44808 19.8018 7.39756 20.2815 8.48695C20.7512 9.57635 20.9911 10.7457 20.9911 11.995H18.9922Z"
                    fill="#428FEC"
                  />
                  <path
                    d="M14.9944 11.995C14.9944 11.1655 14.7046 10.4559 14.1149 9.8762C13.5252 9.29653 12.8256 8.99669 11.9961 8.99669V6.9978C13.3753 6.9978 14.5547 7.48753 15.5341 8.45699C16.5036 9.43645 16.9933 10.6058 16.9933 11.995H14.9944Z"
                    fill="#428FEC"
                  />
                  <path
                    d="M20.7701 15.2832C20.6202 15.1133 20.4303 14.9933 20.1905 14.9434L16.7424 14.2438C16.5125 14.2138 16.2726 14.2338 16.0328 14.3037C15.7929 14.3837 15.593 14.4936 15.4431 14.6435L13.0944 16.9922C11.8251 16.2227 10.6657 15.3232 9.60633 14.2737C8.54692 13.2243 7.66741 12.0949 6.9678 10.8956L9.39645 8.44697C9.54636 8.29706 9.64631 8.12715 9.68629 7.93726C9.72626 7.74736 9.73626 7.53748 9.69628 7.29761L9.04664 3.79956C9.01666 3.56968 8.90672 3.37979 8.71682 3.21988C8.53692 3.06996 8.32704 3 8.09717 3H4.04942C3.74958 3 3.49972 3.09994 3.29983 3.29983C3.09994 3.49972 3 3.74958 3 4.04942C3 6.19822 3.47973 8.29706 4.4392 10.3359C5.39867 12.3748 6.65797 14.1838 8.23709 15.7629C9.80622 17.342 11.6152 18.6013 13.6641 19.5608C15.7029 20.5203 17.8018 21 19.9506 21C20.2504 21 20.5003 20.9001 20.7002 20.7002C20.9001 20.5003 21 20.2504 21 19.9506V15.9028C21 15.673 20.92 15.4631 20.7801 15.2932L20.7701 15.2832ZM5.37868 7.02776C5.22876 6.35813 5.10883 5.68851 5.02887 4.99889H7.24764L7.66741 7.34758L6.01832 8.99667C5.73848 8.34703 5.5186 7.6874 5.36868 7.02776H5.37868ZM18.9911 18.9411C18.3115 18.8912 17.6319 18.7812 16.9522 18.6113C16.2726 18.4414 15.613 18.2215 14.9634 17.9417L16.6424 16.2726L18.9911 16.7424V18.9411Z"
                    fill="#00308C"
                  />
                </svg>
                <span class="visually-hidden">Phone Number</span>
                <a href="tel:${data.mainPhone}">${formattedMainPhone}</a>
              </div>
            `
          : null}
        ${data.c_additionalProfiles?.length > 0
          ? repeat(
              data.c_additionalProfiles,
              (profile) => profile,
              (profile, index) =>
                html`<div slot="additional-location" data-index=${index}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M12 12C12.55 12 13.02 11.8 13.41 11.41C13.8 11.02 14 10.55 14 10C14 9.45 13.8 8.98 13.41 8.59C13.02 8.2 12.55 8 12 8C11.45 8 10.98 8.2 10.59 8.59C10.2 8.98 10 9.45 10 10C10 10.55 10.2 11.02 10.59 11.41C10.98 11.8 11.45 12 12 12ZM12 12C12.55 12 13.02 11.8 13.41 11.41C13.8 11.02 14 10.55 14 10C14 9.45 13.8 8.98 13.41 8.59C13.02 8.2 12.55 8 12 8C11.45 8 10.98 8.2 10.59 8.59C10.2 8.98 10 9.45 10 10C10 10.55 10.2 11.02 10.59 11.41C10.98 11.8 11.45 12 12 12ZM12 12C12.55 12 13.02 11.8 13.41 11.41C13.8 11.02 14 10.55 14 10C14 9.45 13.8 8.98 13.41 8.59C13.02 8.2 12.55 8 12 8C11.45 8 10.98 8.2 10.59 8.59C10.2 8.98 10 9.45 10 10C10 10.55 10.2 11.02 10.59 11.41C10.98 11.8 11.45 12 12 12Z"
                      fill="#428FEC"
                    />
                    <path
                      d="M12.0018 22.06L10.6518 20.82C8.47181 18.82 6.88181 17.03 5.80181 15.34C4.59181 13.47 4.01181 11.78 4.01181 10.19C4.00181 7.84 4.78181 5.86 6.32181 4.32C7.86181 2.78 9.77181 2 12.0018 2C14.2318 2 16.1318 2.78 17.6818 4.32C19.2218 5.86 20.0018 7.84 20.0018 10.2C20.0018 11.79 19.4118 13.47 18.2118 15.35C17.1218 17.04 15.5418 18.83 13.3618 20.83L12.0118 22.07L12.0018 22.06ZM12.0018 19.35C14.0218 17.49 15.5518 15.78 16.5218 14.26C17.5018 12.74 18.0018 11.38 18.0018 10.2C18.0018 8.39 17.4218 6.89 16.2618 5.74C15.1018 4.59 13.6718 4 12.0018 4C10.3318 4 8.89181 4.58 7.74181 5.74C6.59181 6.89 6.00181 8.39 6.00181 10.2C6.00181 11.38 6.50181 12.74 7.48181 14.26C8.46181 15.78 9.98181 17.49 12.0018 19.35Z"
                      fill="#00308C"
                    />
                  </svg>
                  ${profile.officeName
                    ? html`<strong>${profile.officeName}</strong><br />`
                    : null}
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    href="https://www.google.com/maps/search/?api=1&map_action=map&query=${encodeURI(
                      profile.complement
                    )}"
                  >
                    ${profile.complement}
                  </a>
                  ${profile.phoneNumber
                    ? html`<svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="20"
                          height="20"
                          viewBox="0 0 24 24"
                          fill="none"
                        >
                          <path
                            d="M18.9922 11.995C18.9922 10.0461 18.3126 8.397 16.9533 7.03776C15.5941 5.67851 13.945 4.99889 11.9961 4.99889V3C13.2454 3 14.4148 3.23987 15.5041 3.70961C16.5935 4.18934 17.543 4.82898 18.3526 5.63853C19.1621 6.44808 19.8018 7.39756 20.2815 8.48695C20.7512 9.57635 20.9911 10.7457 20.9911 11.995H18.9922Z"
                            fill="#428FEC"
                          />
                          <path
                            d="M14.9944 11.995C14.9944 11.1655 14.7046 10.4559 14.1149 9.8762C13.5252 9.29653 12.8256 8.99669 11.9961 8.99669V6.9978C13.3753 6.9978 14.5547 7.48753 15.5341 8.45699C16.5036 9.43645 16.9933 10.6058 16.9933 11.995H14.9944Z"
                            fill="#428FEC"
                          />
                          <path
                            d="M20.7701 15.2832C20.6202 15.1133 20.4303 14.9933 20.1905 14.9434L16.7424 14.2438C16.5125 14.2138 16.2726 14.2338 16.0328 14.3037C15.7929 14.3837 15.593 14.4936 15.4431 14.6435L13.0944 16.9922C11.8251 16.2227 10.6657 15.3232 9.60633 14.2737C8.54692 13.2243 7.66741 12.0949 6.9678 10.8956L9.39645 8.44697C9.54636 8.29706 9.64631 8.12715 9.68629 7.93726C9.72626 7.74736 9.73626 7.53748 9.69628 7.29761L9.04664 3.79956C9.01666 3.56968 8.90672 3.37979 8.71682 3.21988C8.53692 3.06996 8.32704 3 8.09717 3H4.04942C3.74958 3 3.49972 3.09994 3.29983 3.29983C3.09994 3.49972 3 3.74958 3 4.04942C3 6.19822 3.47973 8.29706 4.4392 10.3359C5.39867 12.3748 6.65797 14.1838 8.23709 15.7629C9.80622 17.342 11.6152 18.6013 13.6641 19.5608C15.7029 20.5203 17.8018 21 19.9506 21C20.2504 21 20.5003 20.9001 20.7002 20.7002C20.9001 20.5003 21 20.2504 21 19.9506V15.9028C21 15.673 20.92 15.4631 20.7801 15.2932L20.7701 15.2832ZM5.37868 7.02776C5.22876 6.35813 5.10883 5.68851 5.02887 4.99889H7.24764L7.66741 7.34758L6.01832 8.99667C5.73848 8.34703 5.5186 7.6874 5.36868 7.02776H5.37868ZM18.9911 18.9411C18.3115 18.8912 17.6319 18.7812 16.9522 18.6113C16.2726 18.4414 15.613 18.2215 14.9634 17.9417L16.6424 16.2726L18.9911 16.7424V18.9411Z"
                            fill="#00308C"
                          />
                        </svg>
                        <span class="visually-hidden">Phone Number</span>
                        <a href="tel:${profile.phoneNumber}">
                          ${formatPhone(profile.phoneNumber)}
                        </a>`
                    : null}
                </div>`
            )
          : null}
        ${data.acceptingNewPatients
          ? html`
              <div slot="accepting">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M10.6016 16.5999L17.6516 9.5499L16.2516 8.1499L10.6016 13.7999L7.75156 10.9499L6.35156 12.3499L10.6016 16.5999Z"
                    fill="#428FEC"
                  />
                  <path
                    d="M21.21 8.1C20.69 6.88 19.97 5.83 19.07 4.93C18.17 4.03 17.11 3.32 15.9 2.79C14.68 2.27 13.38 2 12 2C10.62 2 9.32 2.26 8.1 2.79C6.88 3.32 5.83 4.03 4.93 4.93C4.03 5.83 3.32 6.89 2.79 8.1C2.26 9.32 2 10.62 2 12C2 13.38 2.26 14.68 2.79 15.9C3.31 17.12 4.03 18.18 4.93 19.07C5.83 19.96 6.89 20.68 8.1 21.21C9.32 21.74 10.62 22 12 22C13.38 22 14.68 21.74 15.9 21.21C17.12 20.69 18.18 19.97 19.07 19.07C19.97 18.17 20.68 17.11 21.21 15.9C21.74 14.68 22 13.38 22 12C22 10.62 21.74 9.32 21.21 8.1ZM17.67 17.68C16.12 19.23 14.23 20.01 11.99 20.01C9.75 20.01 7.87 19.23 6.32 17.68C4.77 16.13 3.99 14.24 3.99 12.01C3.99 9.78 4.77 7.89 6.32 6.34C7.87 4.79 9.76 4.01 11.99 4.01C14.22 4.01 16.11 4.79 17.67 6.34C19.22 7.89 19.99 9.78 19.99 12.01C19.99 14.24 19.22 16.13 17.67 17.68Z"
                    fill="#00308C"
                  />
                </svg>
                Accepting new patients
              </div>
            `
          : null}
        <!-- @todo: implement additional health services (LGBTQIA+)
        <div slot="additional-health">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
          >
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M11.382 5.5H4V3.5H12.618L13.618 5.5H20V7.5H12.382L11.382 5.5Z"
              fill="#E11129"
            />
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M11.382 7.5H4V5.5H12.618L13.618 7.5H20V9.5H12.382L11.382 7.5Z"
              fill="#EC7D2E"
            />
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M11.382 9.5H4V7.5H12.618L13.618 9.5H20V11.5H12.382L11.382 9.5Z"
              fill="#F8EC26"
            />
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M11.382 11.5H4V9.5H12.618L13.618 11.5H20V13.5H12.382L11.382 11.5Z"
              fill="#32A530"
            />
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M11.382 13.5H4V11.5H12.618L13.618 13.5H20V15.5H12.382L11.382 13.5Z"
              fill="#0047C7"
            />
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M11.382 15.5H4V13.5H12.618L13.618 15.5H20V17.5H12.382L11.382 15.5Z"
              fill="#710E82"
            />
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M4 20.5V3.5H6V20.5H4Z"
              fill="#00308C"
            />
          </svg>
          LGBTQIA+ Health
        </div>
        -->
        ${data.c_telehealthVisit
          ? html`
              <div slot="virtual">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M6 16H14V15.45C14 14.72 13.63 14.13 12.9 13.68C12.17 13.23 11.2 13 10 13C8.8 13 7.83 13.23 7.1 13.68C6.37 14.13 6 14.72 6 15.45V16Z"
                    fill="#428FEC"
                  />
                  <path
                    d="M10 12C10.55 12 11.02 11.8 11.41 11.41C11.8 11.02 12 10.55 12 10C12 9.45 11.8 8.98 11.41 8.59C11.02 8.2 10.55 8 10 8C9.45 8 8.98 8.2 8.59 8.59C8.2 8.98 8 9.45 8 10C8 10.55 8.2 11.02 8.59 11.41C8.98 11.8 9.45 12 10 12Z"
                    fill="#428FEC"
                  />
                  <path
                    d="M18 10.5V6C18 5.45 17.8 4.98 17.41 4.59C17.02 4.2 16.55 4 16 4H4C3.45 4 2.98 4.2 2.59 4.59C2.2 4.98 2 5.45 2 6V18C2 18.55 2.2 19.02 2.59 19.41C2.98 19.8 3.45 20 4 20H16C16.55 20 17.02 19.8 17.41 19.41C17.8 19.02 18 18.55 18 18V13.5L22 17.5V6.5L18 10.5ZM16 18H4V6H16V18Z"
                    fill="#00308C"
                  />
                </svg>
                Offers virtual visits
              </div>
            `
          : null}
        ${hiddenValue
          ? html`
              <div slot="partner">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M12.5 11.9498C12.98 11.4198 13.35 10.8098 13.61 10.1298C13.87 9.44982 14 8.73982 14 8.00982C14 7.27982 13.87 6.56982 13.61 5.88982C13.35 5.20982 12.98 4.59982 12.5 4.06982C13.5 4.19982 14.33 4.63982 15 5.38982C15.67 6.13982 16 7.00982 16 8.00982C16 9.00982 15.67 9.88982 15 10.6298C14.33 11.3698 13.5 11.8198 12.5 11.9498Z"
                    fill="#428FEC"
                  />
                  <path
                    d="M18.0008 20.0001V17.0001C18.0008 16.4001 17.8708 15.8301 17.6008 15.2901C17.3308 14.7501 16.9808 14.2701 16.5508 13.8501C17.4008 14.1501 18.1908 14.5401 18.9108 15.0101C19.6308 15.4901 20.0008 16.1501 20.0008 17.0001V20.0001H18.0008Z"
                    fill="#428FEC"
                  />
                  <path
                    d="M20 13V11H18V9H20V7H22V9H24V11H22V13H20Z"
                    fill="#428FEC"
                  />
                  <path
                    d="M10.83 5.17C10.05 4.39 9.1 4 8 4C6.9 4 5.96 4.39 5.17 5.17C4.38 5.95 4 6.9 4 8C4 9.1 4.39 10.04 5.17 10.83C5.95 11.62 6.9 12 8 12C9.1 12 10.04 11.61 10.83 10.83C11.61 10.05 12 9.1 12 8C12 6.9 11.61 5.96 10.83 5.17ZM9.42 9.41C9.03 9.8 8.56 10 8.01 10C7.46 10 6.99 9.8 6.6 9.41C6.21 9.02 6.01 8.55 6.01 8C6.01 7.45 6.21 6.98 6.6 6.59C6.99 6.2 7.46 6 8.01 6C8.56 6 9.03 6.2 9.42 6.59C9.81 6.98 10.01 7.45 10.01 8C10.01 8.55 9.81 9.02 9.42 9.41Z"
                    fill="#00308C"
                  />
                  <path
                    d="M15.56 15.64C15.27 15.17 14.88 14.8 14.4 14.55C13.37 14.03 12.32 13.65 11.25 13.39C10.18 13.13 9.1 13 8 13C6.9 13 5.82 13.13 4.75 13.39C3.68 13.65 2.63 14.04 1.6 14.55C1.12 14.8 0.73 15.16 0.44 15.64C0.15 16.12 0 16.64 0 17.2V20H16V17.2C16 16.63 15.85 16.11 15.56 15.64ZM14 18H2V17.2C2 17.02 2.05 16.85 2.14 16.7C2.23 16.55 2.35 16.43 2.5 16.35C3.4 15.9 4.31 15.56 5.22 15.34C6.14 15.12 7.06 15 8 15C8.94 15 9.86 15.11 10.78 15.34C11.7 15.57 12.6 15.9 13.5 16.35C13.65 16.43 13.77 16.55 13.86 16.7C13.95 16.85 14 17.02 14 17.2V18Z"
                    fill="#00308C"
                  />
                </svg>
                Integrated Network Partner
              </div>
            `
          : undefined}
        ${data.c_url_id
          ? html`
              <div slot="profile-link">
                <outline-button button-variant="compact" icon-type="">
                  <a href="${profileDetailsUrl}">View profile</a>
                </outline-button>
              </div>
            `
          : null}
        <!-- @todo: implement real link for online scheduling -->
        ${data.c_openScheduling
          ? html`
              <div slot="schedule-link">
                <outline-button button-variant="compact reversed" icon-type="">
                  <a href="/doctor/${data.c_url_id}?open-scheduling"
                    >Schedule Online</a
                  >
                </outline-button>
              </div>
            `
          : null}
      </outline-card-provider-listing>
    `;
  }
  // Single instance was created outside of the Input so that the debounce is not called multiple times
  debouncedFunction = debounce(this.fetchSuggestion.bind(this), 150);

  async fetchSuggestion() {
    const params = new URLSearchParams();
    params.set('api_key', this.apiKey);
    params.set('experienceKey', this.experienceKey);
    params.set('verticalKey', this.verticalKey);
    params.set('locale', this.locale);
    params.set('input', `${this.searchSettings.input.toLocaleLowerCase()}`);

    // Encode the autocomplete before constructing the URL
    const url = `${this.urlHref}/${
      this.accountId
    }/search/vertical/autocomplete?v=${this.apiVersion}&${params.toString()}`;

    const response = await fetch(url);

    const suggestions: ResponseSearchSuggestions = await response.json();
    this.searchSuggestions = suggestions.response.results.slice(
      0,
      this.showResults
    );
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
    /*
    The `setTimeout` was introduced when closing the suggestions list
    due to an issue with event bubbling in Safari. Safari is stricter in this regard,
    where the parent event is triggered, preventing the execution of the children's click event.
    To address this, we've included a brief delay in the `focusout` event handling
    to ensure that the click event has time to execute before the code within the `focusout` event is processed.
    */
    setTimeout(() => {
      if (relatedTarget === null) {
        this.isFocus = false;
      }

      if (!!relatedTarget && !currentTarget.contains(relatedTarget)) {
        this.isFocus = false;
      }
    }, 100);
  }

  headingAndBreadcrumbsTemplate(): TemplateResult {
    return html` <outline-breadcrumbs>
        <nav class="breadcrumb">
          <ol slot="breadcrumb">
            <li>
              <a href="/">Home</a>
            </li>
          </ol>
        </nav>
      </outline-breadcrumbs>
      <outline-heading level-size="xxl">
        <h1>Universal Search</h1>
      </outline-heading>`;
  }
  searchAuxiliaryTextTemplate() {
    return html`
      <small>
        Search physicians and advanced practice clinicians across Outline
        Medicine.
      </small>
    `;
  }

  searchBarTemplate(): TemplateResult {
    return html`
      <outline-container
        pulse-orientation="top-right"
        padding="space-0"
        container-width="wide"
        background-color="white"
        max-pulse-size="${this.resizeController.currentBreakpointRange === 0
          ? '200px'
          : '650px'}"
        gap="0px"
        display-pulse-width="1200"
        class="${ifDefined(
          this.resizeController.currentBreakpointRange === 0 ? 'isMobile' : null
        )}"
      >
        ${this.headingAndBreadcrumbsTemplate()}
        <div
          class="exposed-filters"
          @focusout="${(e: FocusEvent) => this._focusOut(e)}"
        >
          <outline-search-bar>
            <form
              class="views-exposed-form form--inline"
              action="/research-clinical-trials/find-clinical-trials"
              method="get"
              id="views-exposed-form-clinical-trials-search-page-1"
              accept-charset="UTF-8"
            >
              <div
                class="js-form-item form-item js-form-type-textfield form-item-search-api-fulltext js-form-item-search-api-fulltext"
              >
                <label
                  for="edit-search-api-fulltext"
                  class="form-item__label font-body"
                  >Search</label
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
                class="form-actions js-form-wrapper form-wrapper"
                id="edit-actions"
              >
                <button
                  class="button--primary button js-form-submit form-submit"
                  type="submit"
                  id="edit-submit-clinical-trials-search"
                  value="Apply"
                  @click=${(e: Event) => this.search(e)}
                >
                  <outline-icon
                    aria-hidden="true"
                    name="search"
                    library="system"
                    size="1.4em"
                  >
                  </outline-icon>
                  <span class="visually-hidden">Apply</span>
                </button>
              </div>
            </form>
          </outline-search-bar>
          <ul
            aria-live="polite"
            class="${this.isFocus
              ? 'open-suggestion'
              : 'close-suggestion'} suggested-list"
          >
            <li class="suggested-title">Suggested Searches</li>
            ${this.searchSuggestions.length > 0
              ? this.searchSuggestions.map(
                  (suggestion: Result) => html`<li>
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
          ${this.searchAuxiliaryTextTemplate()}
        </div>
      </outline-container>
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
          <outline-icon
            name="close"
            library="system"
            size="1.5rem"
            aria-hidden="true"
          ></outline-icon>
          <span class="visually-hidden">Close modal filters</span>
        </button>`
      : null;
  }
  mobileStickyCTATemplate() {
    return this.modalFiltersOpenClose
      ? html`<div class="container-cta-sticky">
          <button
            class="btn link medium"
            type="button"
            @click=${(e: Event) => this.reset(e)}
          >
            Clear
          </button>
          <button
            type="button"
            id="close-modal-mobile"
            class="btn primary medium arrow-right"
            aria-expanded="${this.modalFiltersOpenClose}"
            aria-controls="slider-modal"
            @click=${this.toggleFilterModal}
          >
            Show ${this.totalCount} results
          </button>
        </div>`
      : null;
  }

  pillsAndModalTemplate() {
    return this.resizeController.currentBreakpointRange === 0
      ? html`
          <div class="filters-wrapper">
            <div class="results-meta" aria-live="polite">
              ${this.displayTotalCount()}
            </div>

            <button
              type="button"
              id="openModal"
              class="menu-dropdown-open"
              aria-label="filter modal"
              aria-expanded="${this.modalFiltersOpenClose}"
              aria-controls="slider-modal"
              @click=${this.toggleFilterModal}
            >
              Filters
            </button>
          </div>
        `
      : html`
          <div class="results-meta" aria-live="polite">
            ${this.displayTotalCount()}
          </div>
          <div class="filters-wrapper-desktop">
            <div class="filters-wrapper">
              ${this.resizeController.currentBreakpointRange === 0
                ? null
                : html`<ul class="filters-container" aria-live="polite">
                    ${this.fetchEndpoint.render({
                      pending: () => (this.taskValue ? noChange : null),
                      complete: (data) =>
                        html` ${this.displayFacetsActive(data.response)} `,
                      error: (error) => html`${error}`,
                    })}
                    <li>
                      <button
                        class="btn link medium"
                        type="button"
                        @click=${(e: Event) => this.reset(e)}
                      >
                        Reset search
                      </button>
                    </li>
                  </ul>`}
            </div>
            <form class="outline-form">
              <select
                data-drupal-selector="edit-select-list"
                name="select_list[]"
                id="edit-select-list"
                hidden
                class="form-select news-media-search "
                aria-label="Sort By"
                @change="${(e: Event) => this.handleSort(e)}"
              >
                <option value="relevance">Relevance</option>
                <option value="entity_distance">Distance</option>
              </select>
            </form>
          </div>
        `;
  }
  /* <!-- ToDo Alfredo Sort option was hidden by the client request  --> */
  /**
   * Handles the sorting of search results.
   * @param {Event} e - The event object.
   * @returns {void}
   */
  handleSort(e: Event) {
    const selectElement = e.target as HTMLSelectElement;
    this.sortBys = selectElement.value;
    this.searchSettings.offset = 0;
    this.fetchEndpoint.run();
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

  facetsMobileDesktopTemplate() {
    const classesModal = {
      'slider-modal': true,
      'mobile-hidden': true,
      'is-active': this.modalFiltersOpenClose,
    };
    return this.resizeController.currentBreakpointRange === 0
      ? html`
          <div id="slider-modal" class="${classMap(classesModal)}">
            ${this.facetContentTemplate()}
          </div>
        `
      : html`
          <div id="slider-modal" class="slider-modal">
            ${this.facetContentTemplate()}
          </div>
        `;
  }

  facetContentTemplate() {
    return html` ${this.mobileCloseModalTemplate()}
      <h2>Filters</h2>

      ${this.fetchEndpoint.render({
        pending: () => (this.taskValue ? noChange : null),
        complete: (data) => html` ${this.displayFacets(data.response)} `,
        error: (error) => html`${error}`,
      })}
      ${this.mobileStickyCTATemplate()}`;
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
      ${this.searchBarTemplate()}
      <outline-container>
        <div class="${classMap(classes)}">
          <aside>${this.facetsMobileDesktopTemplate()}</aside>
          <div>
            ${this.pillsAndModalTemplate()}
            ${this.fetchEndpoint.render({
              pending: () =>
                this.taskValue ? this.displayPending() : noChange,
              complete: (data) => this.displayAll(data.response),
              error: (error) => html`${error}`,
            })}
            ${this.totalCount
              ? html`
                  <outline-pager
                    current-page=${this.searchSettings.offset /
                      this.searchSettings.limit +
                    1}
                    total-pages=${Math.ceil(
                      this.totalCount / this.searchSettings.limit
                    )}
                    @click=${(e: Event) => this.handlePageChange(e)}
                    aria-live="polite"
                  ></outline-pager>
                `
              : null}
          </div>
        </div>
      </outline-container>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'outline-yext': OutlineYext;
  }
}
