import { SearchSettings } from './yext-types';

// We use the URL query parameters as a store. We could use something else later such as local storage or Redux, so the URL store is abstracted from getting and setting the search settings.

export const defaultSearchSettings: SearchSettings = {
  input: '',
  offset: 0,
  limit: null,
  filters: {}, // @todo, this is required, but the values have not been tested.
  facetFilters: {}, // @todo this has not been tested.
  sortBys: [{ type: 'RELEVANCE' }],
};

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
