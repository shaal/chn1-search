import {
  SearchSettings,
  VerticalSearchResponseStructure,
} from '../components/outline-yext-universal/outline-yext-types';

const startTime = performance.now();
let lastFetchTime = 0;

// @todo is any of this different per component?
const urlHref = 'https://cdn.yextapis.com/v2/accounts';
const accountId = 'me';
const contentType = 'search/vertical/query';
const apiVersion = '20230406';
const apiKey = '0f3c031ce836961cf921558aca570af3';
const experienceKey = 'universal-search';
const version = 'PRODUCTION';
const locale = 'en';
const requestUrlBase = `${urlHref}/${accountId}/${contentType}`;

export const defaultSearchSettings: SearchSettings = {
  input: '',
  offset: 0,
  limit: 16,
  filters: {}, // @todo, this is required, but the values have not been tested.
  facetFilters: {}, // @todo this has not been tested.
  sortBys: [{ type: 'RELEVANCE' }],
};

export interface YextDataResponse {
  meta: {};
}

export interface YextVerticalDataResponse extends YextDataResponse {
  response?: VerticalSearchResponseStructure;
}

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
    if (key.startsWith('yext_')) {
      searchSettings[key.replace('yext_', '')] = value || '';

      // @todo generalize this.
      if (key === 'yext_sortBys') {
        searchSettings.sortBys = JSON.parse(value);
      }
      if (key === 'yext_facetFilters') {
        searchSettings.facetFilters = JSON.parse(value);
      }
      if (key === 'yext_filters') {
        searchSettings.filters = JSON.parse(value);
      }
    }
  }

  return searchSettings;
};

export const setStoredSearchSettings = (searchSettings: SearchSettings) => {
  const dynamicParams = new URLSearchParams();

  for (const [key, value] of Object.entries(searchSettings)) {
    if (value !== '') {
      dynamicParams.set(key, value.toString());
    } else {
      dynamicParams.delete(key);
    }
  }

  // Hard code setting to retrieve facets?
  dynamicParams.set('retrieveFacets', 'true');

  // @todo generalize this.
  if (searchSettings.sortBys) {
    dynamicParams.set('sortBys', JSON.stringify(searchSettings.sortBys));
  }

  if (searchSettings.filters) {
    dynamicParams.set('filters', JSON.stringify(searchSettings.filters));
  }

  if (searchSettings.facetFilters) {
    dynamicParams.set(
      'facetFilters',
      JSON.stringify(searchSettings.facetFilters)
    );
  }
  setDynamicSearchParams(dynamicParams);
};

export const syncSearchSettingsInStore = () => {
  const searchSettings = getStoredSearchSettings();
  setStoredSearchSettings(searchSettings);
}

/**
 * See https://hitchhikers.yext.com/docs/contentdeliveryapis/search/universalsearch
 * See https://hitchhikers.yext.com/docs/contentdeliveryapis/search/verticalsearch
 */
export const getYextData: (config: {
  verticalKey?: string;
}) => Promise<YextVerticalDataResponse> = async ({ verticalKey }) => {
  const queryParams = new URLSearchParams();

  queryParams.set('v', apiVersion);
  queryParams.set('api_key', apiKey);
  queryParams.set('experienceKey', experienceKey);
  if (verticalKey) {
    queryParams.set('verticalKey', verticalKey || '');
  }
  queryParams.set('version', version);
  queryParams.set('locale', locale);

  getDynamicSearchParams().forEach((value, key) => {
    queryParams.set(key, value);
  });

  const response = await fetch(
    `${requestUrlBase}?${queryParams.toString()}`,
    {}
  );

  const jsonResponse: {
    meta: {};
    response: VerticalSearchResponseStructure;
  } = await response.json();

  // @todo why are we storing these times?
  const endTime = performance.now();
  lastFetchTime = (endTime - startTime) / 1000;

  return jsonResponse;
};
