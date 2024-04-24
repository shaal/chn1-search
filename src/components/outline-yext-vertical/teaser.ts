import { html } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

import {
  Address,
  HighlightedField,
  verticalSearchResult,
} from '../outline-yext-universal/outline-yext-types';
import '../shared/outline-button/outline-button';

import '../shared/outline-teaser/outline-teaser';

export function displayTeaser(vertical: string, result: verticalSearchResult) {
  const cleanData = result.highlightedFields.s_snippet
    ? highlightText(result.highlightedFields.s_snippet)
    : result.data.s_snippet;

  // Get provider's landing page if c_url does not exist
  const url = result.data.c_url
    ? `https://www.ecommunity.com${result.data.c_url}`
    : result.data.landingPageUrl;

  // If name (teaser's title) has highlighted text, display it. Otherwise display plain name string
  const title = result.highlightedFields.name
    ? highlightText(result.highlightedFields.name)
    : result.data.name;

  switch (vertical) {
    case 'healthcare_professionals': {
      const { c_specialties, headshot } = result.data;
      return healthcareProfessionalTeaser(
        headshot?.url,
        title,
        url,
        c_specialties || []
      );
    }

    case 'testimonial': {
      const { c_testimonial_Photo } = result.data;
      return testimonialTeaser(c_testimonial_Photo, title, url, cleanData);
    }

    case 'person': {
      return defaultTeaser(title, url, result.data.c_title);
    }

    case 'page': {
      // Highlight the title if it exists in the highlightedFields
      const highlightedTitle = result.highlightedFields.c_title
        ? highlightText(result.highlightedFields.c_title)
        : result.data.c_title;

      return defaultTeaser(highlightedTitle, url, cleanData);
    }

    case 'locationsearch': {
      const {
        address,
        c_locationHoursAndFax,
        c_googleMapLocations,
        c_phoneSearch,
      } = result.data;
      return locationTeaser(
        title,
        url,
        address,
        c_phoneSearch,
        '',
        c_locationHoursAndFax,
        c_googleMapLocations
      );
    }

    case 'news': {
      const { c_authorCreatedDate } = result.data;
      return newsTeaser(
        `News | ${title}`,
        url,
        cleanData,
        '',
        c_authorCreatedDate
      );
    }

    default: {
      // Handle cases where no specific vertical is matched
      let prefix: string = '';

      switch (vertical) {
        case 'careers_area':
          prefix = `Careers`;
          break;
        case 'procedure':
          prefix = getCategoryFromURL(result.data.c_url);
          break;
        case 'careers_page':
          prefix = `Careers at Community`;
          break;
        default:
          prefix = '';
      }

      // Combine prefix and title for display
      const teaserTitle = `${prefix === '' ? '' : `${prefix} | `} ${title}`;
      return defaultTeaser(teaserTitle, url, cleanData);
    }
  }
}

export function defaultTeaser(title: string, url: string, snippet: string) {
  return html`<outline-teaser
    url="${url}"
    title="${title}"
    snippet="${snippet}"
  >
  </outline-teaser>`;
}

export function newsTeaser(
  title: string,
  url: string,
  snippet: string,
  author: string,
  date: string
) {
  return html`<outline-teaser
    url="${url}"
    title="${title}"
    snippet="${snippet}"
    author="${author}"
    date="${date}"
  >
  </outline-teaser>`;
}

export function healthcareProfessionalTeaser(
  image: string | undefined,
  title: string,
  url: string,
  specialties: string[]
) {
  return html`
    <outline-teaser image="${image}" title="${title}" url="${url}">
      ${specialties?.length > 0
        ? html`
            <ul>
              ${specialties.map((el: string) => html`<li>${el}</li>`)}
            </ul>
          `
        : null}
      <outline-button
        slot="cta"
        button-url="${url}"
        button-title="Request an appointment from profile"
      ></outline-button>
    </outline-teaser>
  `;
}

export function testimonialTeaser(
  image: string | undefined,
  title: string,
  url: string,
  snippet: string
) {
  return html`
    <outline-teaser
      image="${image}"
      title="${title}"
      subtitle="Patient Testimonial"
      snippet="${snippet}"
      url="${url}"
    >
    </outline-teaser>
  `;
}

export function locationTeaser(
  title: string,
  url: string,
  address: Address | undefined,
  phone: string,
  fax: string,
  hours: string | undefined,
  directionsUrl: string | undefined
) {
  return html`
    <outline-teaser
      title="${title}"
      url="${url}"
      phone="${phone}"
      fax="${fax}"
      directions-url="${directionsUrl}"
      hours="${hours}"
    >
      ${address
        ? unsafeHTML(`
      <div slot="address">
        ${address.line1}<br />
        ${address.city}, ${address.region} ${address.postalCode}<br />
      </div>
      `)
        : null}
    </outline-teaser>
  `;
}

function getCategoryFromURL(url: string): string {
  const regex = /\/([^/]+)(?=\/[^/]+$)/;
  const match = url.match(regex);

  return match && match[1]
    ? match[1]
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    : '';
}

function highlightText(content: HighlightedField): string {
  if (!content.matchedSubstrings || content.matchedSubstrings.length === 0) {
    return content.value; // No matches, return original content
  }

  const sortedMatches = content.matchedSubstrings.sort(
    (a, b) => a.offset - b.offset
  );
  let highlightedText = '';
  let inTag = false;
  let inAttribute = false;

  for (let i = 0; i < content.value.length; i++) {
    if (content.value[i] === '<') {
      inTag = true;
    } else if (content.value[i] === '>') {
      inTag = false;
      inAttribute = false;
    } else if (inTag && content.value[i] === '"') {
      inAttribute = !inAttribute;
    }

    if (sortedMatches.length > 0 && i === sortedMatches[0].offset) {
      if (!inTag && !inAttribute) {
        const match = sortedMatches.shift();
        if (match) {
          const end = match.offset + match.length;
          highlightedText += `<span class="highlight">${content.value.substring(i, end)}</span>`;
          i = end - 1; // Skip ahead to the end of the match
          continue;
        }
      } else {
        // Skip highlighting this match as it's within a tag or attribute
        sortedMatches.shift();
      }
    }

    highlightedText += content.value[i];
  }

  return highlightedText;
}
