import { TemplateResult, html } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import {
  HighlightedField,
  verticalSearchResult,
} from '../outline-yext-universal/outline-yext-types';

export function defaultTeaser(
  url: string,
  title: string,
  snippet: string
): TemplateResult {
  return html`
    <h3 class="result-title">
      <a href="${url}"> ${unsafeHTML(title)} </a>
    </h3>
    <div class="result-body">${unsafeHTML(snippet)}</div>
  `;
}

export function displayTeaser(vertical: string, result: verticalSearchResult) {
  const cleanData = result.highlightedFields.s_snippet
    ? highlightText(result.highlightedFields.s_snippet)
    : '';
  switch (vertical) {
    case 'blog':
      return blogTeaser(result, cleanData);
      break;
    default:
      {
        // If name (teaser's title) has highlighted text, display it. Otherwise display plain name string
        const title = result.highlightedFields.name
          ? highlightText(result.highlightedFields.name)
          : result.data.name;
        const url = `https://www.ecommunity.com/node/${result.data.uid}`;
        return defaultTeaser(url, title, cleanData);
      }
      break;
  }
}

export function blogTeaser(result: verticalSearchResult, cleanData: string) {
  return html`
    <h3>
      <a href="${window.location.origin}/node/${result.data.uid}">
        ${result.data.name}
      </a>
    </h3>
    <p>${unsafeHTML(cleanData)}</p>
  `;
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
