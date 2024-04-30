import { getStoredSearchSettings } from './yext-store';
import {
  ResponseSearchSuggestions,
  UniversalSearchResponse,
  VerticalSearchResponseStructure,
} from './yext-types';

import {
  apiKey,
  apiVersion,
  accountId,
  experienceKey,
  locale,
  urlHref,
  version,
} from './yext-config';

// We chose to not use Search Core for now based on discussions with Yext.
// That may be worth revisiting and may be a good replacement for this code.
// See https://hitchhikers.yext.com/tracks/search-backend/search110-intro-to-search/03-ways-to-build-search/
// See https://github.com/yext/search-core

const startTime = performance.now();
let lastFetchTime = 0;

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
export const getYextSearchData: (config?: {
  verticalKey?: string;
}) => Promise<YextSearchDataResponse> = async ({ verticalKey } = {}) => {
  const queryParams = new URLSearchParams();

  queryParams.set('v', apiVersion);
  queryParams.set('api_key', apiKey);
  queryParams.set('experienceKey', experienceKey);
  queryParams.set('version', version);
  queryParams.set('locale', locale);

  if (verticalKey) {
    queryParams.set('verticalKey', verticalKey ?? '');
  }

  const storedSearchSettings = getStoredSearchSettings();

  if (!storedSearchSettings.input) {
    throw new Error('No search input provided');
  }

  Object.keys(storedSearchSettings).forEach(key => {
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

// This has been minimally tested.
// See https://hitchhikers.yext.com/docs/contentdeliveryapis/search/universalsearch.
export const getYextSuggestions = async (input: string = '') => {
  const params = new URLSearchParams();
  params.set('api_key', apiKey);
  params.set('experienceKey', experienceKey);
  params.set('locale', locale);
  params.set('input', `${input.toLocaleLowerCase()}`);

  const response = await fetch(
    `${urlHref}/${accountId}/search/autocomplete?v=${apiVersion}&${params.toString()}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch suggestions');
  }

  const suggestions: ResponseSearchSuggestions = await response.json();

  return suggestions;
};
