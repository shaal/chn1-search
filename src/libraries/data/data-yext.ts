import {
  SearchSettings,
  UniversalSearchResponse,
  VerticalSearchResponseStructure,
} from './yext-types';

const startTime = performance.now();
let lastFetchTime = 0;

// @todo is any of this different per component?
const urlHref = 'https://cdn.yextapis.com/v2/accounts';
const accountId = 'me';
const apiVersion = '20230406';
const apiKey = '0f3c031ce836961cf921558aca570af3';
const experienceKey = 'universal-search';
const version = 'PRODUCTION';
const locale = 'en';

export const defaultSearchSettings: SearchSettings = {
  input: '',
  offset: 0,
  limit: null,
  filters: {}, // @todo, this is required, but the values have not been tested.
  facetFilters: {}, // @todo this has not been tested.
  sortBys: [{ type: 'RELEVANCE' }],
};

export interface YextSearchDataResponse {
  meta: {};
  response: UniversalSearchResponse | VerticalSearchResponseStructure;
}

export const isVerticalSearchResponse = (
  response: UniversalSearchResponse | VerticalSearchResponseStructure
): response is VerticalSearchResponseStructure => {
  return 'modules' in response === false;
};

// We use the URL query parameters as a store. We could use something else later such as local storage or Redux, so the URL store is abstracted from getting and setting the search settings.

const getDynamicSearchParams = () => {
  const url = new URL(window.location.href);
  const searchParams = new URLSearchParams(url.search);

  const dynamicParams = new URLSearchParams();

  for (const key of searchParams.keys()) {
    if (key.startsWith('yext_')) {
      dynamicParams.set(key.replace('yext_', ''), searchParams.get(key) || '');
    }
  }

  return dynamicParams;
};

const setDynamicSearchParams = (dynamicParams: URLSearchParams) => {
  // Get the current URL and its search parameters
  const url = new URL(window.location.href);
  const searchParams = new URLSearchParams(url.search);

  // Remove all `yext_` parameters from the params object
  for (const key of searchParams.keys()) {
    if (key.startsWith('yext_')) {
      searchParams.delete(key);
    }
  }

  // Update the search parameters with the new params
  for (const [key, value] of dynamicParams.entries()) {
    searchParams.set(`yext_${key}`, value);
  }

  // Replace the search parameters in the URL
  url.search = searchParams.toString();

  // Update the browser URL
  window.history.replaceState(null, '', url.toString());
};

export const getStoredSearchSettings = () => {
  const queryParams = getDynamicSearchParams();

  const searchSettings: SearchSettings = defaultSearchSettings;

  for (const [key, value] of queryParams.entries()) {
    searchSettings[key] = value || '';

    // If value is a JSON string, parse it.
    if (value.startsWith('[') || value.startsWith('{')) {
      searchSettings[key] = JSON.parse(value);
    }
  }

  return searchSettings;
};

export const setStoredSearchSettings = (searchSettings: SearchSettings) => {
  const dynamicParams = new URLSearchParams();

  for (const [key, value] of Object.entries(searchSettings)) {
    if (value !== '' && value !== null) {
      dynamicParams.set(
        key,
        typeof value === 'string' ? value : JSON.stringify(value)
      );
    } else {
      dynamicParams.delete(key);
    }
  }

  // Hard code setting to retrieve facets?
  dynamicParams.set('retrieveFacets', 'true');

  setDynamicSearchParams(dynamicParams);
};

export const syncSearchSettingsInStore = () => {
  const searchSettings = getStoredSearchSettings();
  setStoredSearchSettings(searchSettings);
};

/**
 * See https://hitchhikers.yext.com/docs/contentdeliveryapis/search/universalsearch
 * See https://hitchhikers.yext.com/docs/contentdeliveryapis/search/verticalsearch
 */
export const getYextSearchData: (config: {
  verticalKey?: string;
}) => Promise<YextSearchDataResponse> = async ({ verticalKey }) => {
  const queryParams = new URLSearchParams();

  queryParams.set('v', apiVersion);
  queryParams.set('api_key', apiKey);
  queryParams.set('experienceKey', experienceKey);
  if (verticalKey) {
    queryParams.set('verticalKey', verticalKey || '');
  }
  queryParams.set('version', version);
  queryParams.set('locale', locale);

  const dynamicParams = getDynamicSearchParams();

  if (!dynamicParams.has('input')) {
    throw new Error('No search input provided');
  }

  dynamicParams.forEach((value, key) => {
    queryParams.set(key, value);
  });

  const jsonResponse =
    verticalKey && verticalKey !== 'all'
      ? getYextVerticalSearchData(queryParams)
      : getYextUniversalSearchData(queryParams);

  // @todo why are we storing these times?
  const endTime = performance.now();
  lastFetchTime = (endTime - startTime) / 1000;

  return jsonResponse;
};

// @todo for TS purposes? Can we combine these and still get useful types?
const getYextUniversalSearchData = async (queryParams: URLSearchParams) => {
  const response = await fetch(
    `${urlHref}/${accountId}/search/query?${queryParams.toString()}`,
    {}
  );

  if (!response.ok) {
    throw new Error('Failed to fetch data');
  }

  const jsonResponse: {
    meta: {};
    response: UniversalSearchResponse;
  } = await response.json();

  return jsonResponse;
};

const getYextVerticalSearchData = async (queryParams: URLSearchParams) => {
  // Be extra careful not to include `limit` or we get errors.

  queryParams.delete('limit');

  const response = await fetch(
    `${urlHref}/${accountId}/search/vertical/query?${queryParams.toString()}`,
    {}
  );

  if (!response.ok) {
    throw new Error('Failed to fetch data');
  }

  const jsonResponse: {
    meta: {};
    response: VerticalSearchResponseStructure;
  } = await response.json();

  return jsonResponse;
};

// @todo this was copy and pasted from other versions without updating. It will need to be refactored to match getYextData.
/*
async getYextSuggestions() {
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

  // this.searchSuggestions = suggestions.response.results.slice(
  //   0,
  //   this.showResults
  // );
  this.isFocus = this.searchSuggestions.length > 0;
}
*/
