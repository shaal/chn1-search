import { getStoredSearchSettings } from './yext-store';
import {
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

export interface YextSearchDataResponse {
  meta: {};
  response: UniversalSearchResponse | VerticalSearchResponseStructure;
}

export const isVerticalSearchResponse = (
  response: UniversalSearchResponse | VerticalSearchResponseStructure
): response is VerticalSearchResponseStructure => {
  return 'modules' in response === false;
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

  const storedSearchSettings = getStoredSearchSettings();

  if (!storedSearchSettings.input) {
    throw new Error('No search input provided');
  }

  Object.keys(storedSearchSettings).forEach((key) => {
    const value = storedSearchSettings[key];

    if (!value) {
      return;
    }

    if (typeof value === 'object' || Array.isArray(value)) {
      queryParams.set(key, JSON.stringify(value));
    } else {
      queryParams.set(key, value.toString());
    }
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
  // Be extra careful not to include `limit` or we get errors.
  queryParams.delete('limit');
  
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
