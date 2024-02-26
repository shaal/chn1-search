export type QueryParam = {
  [key: string]: SubQueryParam[];
};

export type SubQueryParam = {
  [key: string]: { $eq: string };
};

export interface SearchSettings {
  [key: string]: string | number | QueryParam;
  input: string;
  offset: number;
  limit: number;
  facetFilters: QueryParam;
}

export type verticalSearchResponseStructure = {
  entities: EntityDataStructure[];
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
  data: HealthcareProfessional;
  highlightedFields: Record<string, unknown>;
  distance: number;
  distanceFromFilter: number;
}[];

export type verticalSearchResultsDataStructure = {
  address: {
    line1: string;
    city: string;
    region: string;
    postalCode: string;
    countryCode: string;
  };
  cityCoordinate: {
    latitude: number;
    longitude: number;
  };
  fax: string;
  firstName: string;
  geocodedCoordinate: {
    latitude: number;
    longitude: number;
  };
  id: string;
  isoRegionCode: string;
  lastName: string;
  mainPhone: string;
  name: string;
  npi: string;
  timeZoneUtcOffset: string;
  timezone: string;
  type: string;
  uid: string;
};

export type HealthcareProfessional = {
  entities: EntityDataStructure[];
  c_url_id: string;
  c_clinicalTitles: string[];
  c_expertise: string[];
  c_subSpecialtyDisplayName_Temporary: string;
  c_subSpecialtyDisplayName: string;
  c_specialtyName: string[];
  id: string;
  type: string;
  website: string;
  covid19InformationUrl: string;
  googlePlaceId: string;
  neighborhood: string;
  telehealthUrl: string;
  acceptingNewPatients: boolean;
  address: {
    line1: string;
    city: string;
    region: string;
    postalCode: string;
    countryCode: string;
  };
  associations: string[];
  description: string;
  logo: {
    image: {
      url: string;
      width: number;
      height: number;
      sourceUrl: string;
      thumbnails: {
        url: string;
        width: number;
        height: number;
      }[];
    };
    clickthroughUrl: string;
    description: string;
  };
  name: string;
  cityCoordinate: {
    latitude: number;
    longitude: number;
  };
  c_folder1: string;
  c_folder2: string;
  c_telehealthVisit: boolean;
  c_openScheduling: boolean;
  c_additionalProfiles: {
    entityId: string;
    name: string;
    complement: string;
    officeName: string;
    phoneNumber: string;
  }[];
  ratings: string;
  c_specialtyFAD: {
    entityId: string;
    name: string;
  }[];
  c_trackingTag: string;
  c_websiteNoTracking: string;
  facebookPageUrl: string;
  fax: string;
  featuredMessage: {
    description: string;
    url: string;
  };
  firstName: string;
  gender: string;
  geocodedCoordinate: {
    latitude: number;
    longitude: number;
  };
  googleAccountId: string;
  googleCoverPhoto: {
    url: string;
    width: number;
    height: number;
  };
  googleProfilePhoto: {
    url: string;
    width: number;
    height: number;
    sourceUrl: string;
    thumbnails: {
      url: string;
      width: number;
      height: number;
    }[];
  };
  headshot: {
    url: string;
    width: number;
    height: number;
    sourceUrl: string;
    thumbnails: {
      url: string;
      width: number;
      height: number;
    }[];
  };
  admittingHospitals: string[];
  degrees: string[];
  instagramHandle?: string;
  isoRegionCode: string;
  keywords: string[];
  languages: string[];
  lastName: string;
  mainPhone: string;
  npi: string;
  officeName: string;
  reservationUrl: {
    url: string;
    displayUrl: string;
  };
  services: string[];
  timezone: string;
  twitterHandle?: string;
  websiteUrl: {
    url: string;
    displayUrl: string;
    preferDisplayUrl?: boolean;
  };
  yextDisplayCoordinate: {
    latitude: number;
    longitude: number;
  };
  yextRoutableCoordinate: {
    latitude: number;
    longitude: number;
  };
  googleAttributes: {
    has_wheelchair_accessible_entrance?: string[];
    has_restroom?: string[];
  };
  categoryIds: string[];
  timeZoneUtcOffset: string;
  uid: string;
};

export interface Meta {
  uuid: string;
  errors: [];
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

export interface Input {
  value: string;
  queryIntents: [];
}

export interface Response {
  input: Input;
  results: Result[];
}

export interface ResponseSearchSuggestions {
  meta: Meta;
  response: Response;
}

export interface yextJsonResponse {
  meta: {};
  response: verticalSearchResponseStructure;
}

export interface YextLocation {
  title: string;
  address: string;
  latitude: number;
  longitude: number;
  number: string;
}

export type EntityDataStructure = {
  c_lGBTQHealth: string;
  linkedInUrl: string;
  c_lGBTQIAHealth: boolean;
  specialtyTitle: string[];
  id: string;
  c_subSpecialtyDisplayName_Temporary: string;
  c_subSpecialtyDisplayName: string;
  c_residency: string;
  c_fellowship: [string];
  c_url_id: string;
  associations: string;
  c_videoInterviewURL: string;
  c_openSchedulingVisitTypeId: [string];
  c_openSchedulingDepartmentId: [string];
  c_honorsAndAwards: string;
  c_publicationsNationalPresentations: string;
  c_medicalSchoolName: string;
  c_education: [string];
  c_boardCertifiedSpecialties: string[];
  c_trainingInfo: string;
  c_postgraduateTraining: string;
  c_employer: string;
  c_clinicalTitles: string[];
  c_academicTitles: string[];
  c_biography: string;
  c_specialtyFAD: string[];
  c_specialtyName: string[];
  c_expertise: string[];
  googlePlaceId: string;
  acceptingNewPatients: boolean;
  address: {
    line1: string;
    line2: string;
    city: string;
    region: string;
    postalCode: string;
    extraDescription: string;
    countryCode: string;
  };
  description: string;
  hours: {
    monday: {
      isClosed: boolean;
    };
    tuesday: {
      isClosed: boolean;
    };
    wednesday: {
      isClosed: boolean;
    };
    thursday: {
      isClosed: boolean;
    };
    friday: {
      isClosed: boolean;
    };
    saturday: {
      isClosed: boolean;
    };
    sunday: {
      isClosed: boolean;
    };
  };
  logo: {
    image: {
      url: string;
      width: number;
      height: number;
      sourceUrl: string;
      thumbnails: {
        url: string;
        width: number;
        height: number;
      }[];
    };
  };
  name: string;
  cityCoordinate: {
    latitude: number;
    longitude: number;
  };
  closed: boolean;
  c_folder1: string;
  c_folder2: string;
  c_titles: string[];
  c_trackingTag: string;
  c_websiteNoTracking: string;
  c_openScheduling: boolean;
  facebookPageUrl: string;
  featuredMessage: {
    url: string;
  };
  firstName: string;
  gender: string;
  geocodedCoordinate: {
    latitude: number;
    longitude: number;
  };
  googleAccountId: string;
  googleCoverPhoto: {
    url: string;
    width: number;
    height: number;
    thumbnails: {
      url: string;
      width: number;
      height: number;
    }[];
  };
  googleProfilePhoto: {
    url: string;
    width: number;
    height: number;
    sourceUrl: string;
  };
  headshot: {
    url: string;
    width: number;
    height: number;
    sourceUrl: string;
    thumbnails: {
      url: string;
      width: number;
      height: number;
    }[];
  };
  admittingHospitals: string[];
  degrees: string[];
  isoRegionCode: string;
  keywords: string[];
  languages: string[];
  lastName: string;
  mainPhone: string;
  npi: string;
  officeName: string;
  orderUrl: {
    url: string;
    displayUrl: string;
    preferDisplayUrl: boolean;
  };
  reservationUrl: {
    url: string;
    displayUrl: string;
    preferDisplayUrl: boolean;
  };
  timezone: string;
  twitterHandle: string;
  instagramHandle: string;
  websiteUrl: {
    url: string;
    displayUrl: string;
    preferDisplayUrl: boolean;
  };
  yextDisplayCoordinate: {
    latitude: number;
    longitude: number;
  };
  yextRoutableCoordinate: {
    latitude: number;
    longitude: number;
  };
  videos: {
    video: {
      url: string;
    };
  }[];
  meta: {
    accountId: string;
    uid: string;
    id: string;
    timestamp: string;
    labels: string[];
    folderId: string;
    schemaTypes: string[];
    language: string;
    countryCode: string;
    entityType: string;
  };
  googleAttributes: {
    has_wheelchair_accessible_elevator: string[];
    has_wheelchair_accessible_entrance: string[];
    has_restroom: string[];
    has_wheelchair_accessible_restroom: string[];
  };
  categoryIds: string[];
  timeZoneUtcOffset: string;
};
export type PubMedSearchResponse = {
  header: {
    type: string;
    version: string;
  };
  esearchresult: {
    count: string;
    retmax: string;
    retstart: string;
    idlist: string[];
    translationset: Array<{
      from: string;
      to: string;
    }>;
    querytranslation: string;
  };
};

export type RatingDistribution = {
  rating: number;
  count: number;
  percentage: number;
  formatted_percentage: string;
};

export type QuestionRatings = {
  label: string;
  short_label: string;
  rating: string;
  rating_2: string;
  rating_precise: string;
  stars: string;
  question_count: number;
};

export type CommentData = {
  rating: number;
  comment: string;
  review_id: string;
  review_date: string;
  review_timestamp: string;
  review_source: string;
  review_source_label: string;
  review_source_icon: string;
};

export type CommentMeta = {
  page_num: number;
  page_size: number;
  total_pages: number;
  total_results: number;
  feed: string;
  filters: Record<string, unknown>;
};

export type CommentLinks = {
  self: string;
  next: string;
  first: string;
  last: string;
};

export type Comments = {
  data: CommentData[];
  meta: CommentMeta;
  links: CommentLinks;
};

export type RatingResponse = {
  message: string;
  resource: string;
  name: string;
  slug: string;
  identifier: string;
  identifier_type: string;
  website: string;
  image: string;
  profile_page: string;
  specialties: string[];
  address: string;
  city: string;
  state: string;
  type: string;
  schema: string;
  feed: string;
  group: boolean;
  rating: string;
  rating_2: string;
  rating_precise: string;
  rating_count: number;
  comment_count: number;
  review_sources: string[];
  widget_css: string;
  rating_distribution: Record<string, RatingDistribution>;
  comment_distribution: Record<string, RatingDistribution>;
  question_ratings: QuestionRatings[];
  comments: Comments;
};
/* Tester data */
/*
{
  "id": "test",
  "type": "healthcareProfessional",
  "address": {
    "line1": "100 Test Blvd",
    "line2": "Suite 200",
    "city": "New York",
    "region": "NY",
    "postalCode": "10003",
    "countryCode": "US"
  },
  "addressHidden": false,
  "name": "Test Tester, MD",
  "cityCoordinate": {
    "latitude": 40.757929,
    "longitude": -73.985506
  },
  "c_employedOrNonEmployed": [
    "Non Employed"
  ],
  "c_specialtyFAD": [
    {
      "entityId": "SPEC-7",
      "name": "Cardiology"
    },
    {
      "entityId": "SPEC-73",
      "name": "Pediatric Cardiology"
    }
  ],
  "emails": [
    "test@gmail.com"
  ],
  "firstName": "Test",
  "gender": "Male",
  "headshot": {
    "url": "https://a.mktgcdn.com/p/nRaUZ40jrYoAf6GX-Wfum5C56Mziz8Ck8TLDICvttHw/500x600.jpg",
    "width": 500,
    "height": 600,
    "sourceUrl": "https://doctors.melrosewakefield.org//Custom/Photos/hires/68.jpg",
    "thumbnails": [
      {
        "url": "https://a.mktgcdn.com/p/nRaUZ40jrYoAf6GX-Wfum5C56Mziz8Ck8TLDICvttHw/500x600.jpg",
        "width": 500,
        "height": 600
      },
      {
        "url": "https://a.mktgcdn.com/p/nRaUZ40jrYoAf6GX-Wfum5C56Mziz8Ck8TLDICvttHw/375x450.jpg",
        "width": 375,
        "height": 450
      },
      {
        "url": "https://a.mktgcdn.com/p/nRaUZ40jrYoAf6GX-Wfum5C56Mziz8Ck8TLDICvttHw/196x235.jpg",
        "width": 196,
        "height": 235
      }
    ]
  },
  "languages": [
    "English",
    "French"
  ],
  "lastName": "Tester",
  "mainPhone": "+18407543786",
  "officeName": "Test Medical Clinic",
  "timezone": "America/New_York",
  "yextDisplayCoordinate": {
    "latitude": 40.792401,
    "longitude": -73.8276081
  },
  "timeZoneUtcOffset": "-04:00",
  "uid": "93449374"
}
*/
