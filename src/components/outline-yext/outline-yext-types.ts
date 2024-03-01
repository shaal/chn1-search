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
  c_uRL: string;
  uid: string;
};

export type ResultData = {
  data: ResultItemData;
  highlightedFields: {
    c_body?: HighlightedField;
    name?: HighlightedField;
  };
};

export type Module = {
  verticalConfigId: string;
  resultsCount: number;
  encodedState: string;
  results: ResultData[];
};

export type SearchResponse = {
  businessId: number;
  modules: Module[];
};
