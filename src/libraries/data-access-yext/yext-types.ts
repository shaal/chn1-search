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
  [key: string]: string | number | QueryParam | Object | null;
  input: string;
  limit: number | null;
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

export interface ResponseContent {
  input: {
    value: string;
  };
  results: Result[];
}

export interface ResponseSearchSuggestions {
  meta: Meta;
  response: ResponseContent;
}

// Universal search response types
export type HighlightedField = {
  value: string;
  matchedSubstrings: {
    offset: number;
    length: number;
  }[];
};

export type Address = {
  city: string;
  countryCode: string;
  line1: string;
  postalCode: string;
  region: string;
};

export type ResultItemData = {
  id: string;
  type: string;
  name: string;
  c_title: string;
  c_bodyMarkedown: string;
  c_url: string;
  c_testimonial_Photo?: string;
  c_specialties?: [];
  headshot?: { url?: string };
  s_snippet: string;
  uid: string;
  address?: Address;
  c_locationHoursAndFax?: string;
  c_googleMapLocations?: string;
  c_phoneSearch?: string;
};

export type ResultData = {
  data: ResultItemData;
  highlightedFields: {
    c_bodyMarkedown?: HighlightedField;
    name?: HighlightedField;
    c_title?: HighlightedField;
    s_snippet?: HighlightedField;
  };
};

export type Module = {
  verticalConfigId: string;
  resultsCount: number;
  encodedState: string;
  // results: ResultData[];
  results: verticalSearchResult[];
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
  results: verticalSearchResult[];
  appliedQueryFilters: unknown[];
  facets: Facet[];
  searchIntents: unknown[];
  source: string;
  directAnswer: Record<string, unknown>;
  alternativeVerticals: Record<string, unknown>;
  spellCheck: Record<string, unknown>;
  locationBias: Record<string, unknown>;
  allResultsForVertical: Record<string, unknown>;
  c_additionalProfiles: Array<string>;
};

export type verticalSearchResult = {
  data: ResultItemData;
  highlightedFields: ResultData['highlightedFields'];
  distance: number;
  distanceFromFilter: number;
};

export type Facet = {
  fieldId: string;
  displayName: string;
  options: {
    displayName: string;
    count: number;
    selected: boolean;
    filter: SubQueryParam;
  }[];
};
