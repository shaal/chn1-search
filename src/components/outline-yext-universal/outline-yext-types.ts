// Universal search query types
export interface Meta {
  uuid: string;
  errors: [];
}

export type QueryParam = {
  [key: string]: SubQueryParam[];
};

export type SubQueryParam = {
  [key: string]: { $eq: string };
};

export interface SearchSettings {
  [key: string]: string | number | QueryParam;
  input: string;
  limit: number;
  offset: number;
  // facetFilters: QueryParam;
}

export interface MatchedSubstring {
  offset: number;
  length: number;
}

export interface Result {
  value: string;
  matchedSubstrings: MatchedSubstring[];
  queryIntents: [];
  verticalKeys: string[];
}

export interface ResponseSearchSuggestions {
  meta: Meta;
  response: Response;
}

// Universal search response types
export type HighlightedField = {
  value: string;
  matchedSubstrings: {
    offset: number;
    length: number;
  }[];
};

export type ResultItemData = {
  id: string;
  type: string;
  name: string;
  c_body: string;
  c_title: string;
  c_url: string;
  uid: string;
};

export type ResultData = {
  data: ResultItemData;
  highlightedFields: {
    c_body?: HighlightedField;
    name?: HighlightedField;
    c_title?: HighlightedField;
  };
};

export type Module = {
  verticalConfigId: string;
  resultsCount: number;
  encodedState: string;
  results: ResultData[];
};

export type UniversalSearchResponse = {
  businessId: number;
  modules: Module[];
};

// Vertical search

export type VerticalSearchResponseStructure = {
  businessId: number;
  queryId: string;
  resultsCount: number;
  results: verticalSearchResults;
  appliedQueryFilters: unknown[];
  facets: {
    fieldId: string;
    displayName: string;
    options: {
      displayName: string;
      count: number;
      selected: boolean;
      filter: SubQueryParam;
    }[];
  }[];
  searchIntents: unknown[];
  source: string;
  directAnswer: Record<string, unknown>;
  alternativeVerticals: Record<string, unknown>;
  spellCheck: Record<string, unknown>;
  locationBias: Record<string, unknown>;
  allResultsForVertical: Record<string, unknown>;
  c_additionalProfiles: Array<string>;
};

export type verticalSearchResults = {
  data: {
    uid: string;
    name: string;
    c_body: string;
  };
  highlightedFields: Record<string, unknown>;
  distance: number;
  distanceFromFilter: number;
}[];
