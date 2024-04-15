import { LitElement, html, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { AdoptedStyleSheets } from '../../../controllers/adopted-stylesheets.ts';
import { ResizeController } from '../../../controllers/resize-controller';
import encapsulatedStyles from './outline-teaser.css?inline';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { classMap } from 'lit/directives/class-map.js';

/**
 * The Outline Teaser component
 * @element outline-teaser
 * @slot - default slot, used for everything.
 */

@customElement('outline-teaser')
export class OutlineTeaser extends LitElement {
  adoptedStyleSheets = new AdoptedStyleSheets(this, {
    encapsulatedCSS: encapsulatedStyles,
  });

  resizeController = new ResizeController(this, {});

  @property({ type: String, attribute: 'image' })
  teaserImage?: string;

  @property({ type: String, attribute: 'url' })
  teaserUrl?: string;

  @property({ type: String, attribute: 'title' })
  teaserTitle?: string;

  @property({ type: String, attribute: 'subtitle' })
  teaserSubtitle?: string;

  @property({ type: String, attribute: 'snippet' })
  teaserSnippet?: string;

  @property({ type: String, attribute: 'phone' })
  teaserPhone?: string;

  @property({ type: String, attribute: 'fax' })
  teaserFax?: string;

  @property({ type: String, attribute: 'directions-url' })
  teaserDirectionsUrl?: string;

  @property({ type: String, attribute: 'hours' })
  teaserHours?: string;

  @state() hasAddressSlot?: boolean;
  @state() hasCtaSlot?: boolean;

  locationInformationTemplate(): TemplateResult {
    return html`
      <div class="location-information">
        <div class="inner">
          ${this.hasAddressSlot
            ? html`
                <h4>Location</h4>
                <div class="address">
                  <slot name="address"></slot>
                </div>
              `
            : null}
          ${this.teaserPhone
            ? html`<a href="tel:${this.teaserPhone}">${this.teaserPhone}</a>`
            : null}
          ${this.teaserFax ? html` <p class="fax">${this.teaserFax}</p>` : null}
          ${this.teaserDirectionsUrl
            ? html` <a class="directions" href="${this.teaserDirectionsUrl}">
                Get directions
              </a>`
            : null}
        </div>
      </div>
    `;
  }

  render(): TemplateResult {
    this.hasAddressSlot = this.querySelector('[slot="address"]') !== null;
    this.hasCtaSlot = this.querySelector('[slot="cta"]') !== null;

    const isMobile = this.resizeController.currentBreakpointRange === 0;

    return html` <div
      class="${classMap({
        'teaser': true,
        'has-image': this.teaserImage && this.teaserImage !== '',
        'is-mobile': isMobile,
      })}"
    >
      ${this.teaserImage
        ? html`
            <div class="image">
              <img src="${this.teaserImage}" alt="${this.teaserTitle}" />
            </div>
          `
        : null}

      <div class="content">
        <h3 class="title">
          <a href="${window.location.origin}/node/${this.teaserUrl}}"
            >${unsafeHTML(this.teaserTitle)}</a
          >
        </h3>

        ${this.teaserSubtitle
          ? html` <div class="subtitle">${this.teaserSubtitle}</div> `
          : null}

        <div
          class="${classMap({
            'body': true,
            'has-hours': this.teaserHours,
            'is-mobile': isMobile,
          })}"
        >
          ${this.teaserSnippet
            ? html`${unsafeHTML(this.teaserSnippet)}`
            : html`<slot></slot>`}
          ${this.locationInformationTemplate()}
          ${this.teaserHours
            ? html`
                <div class="hours">
                  <h4>Hours</h4>
                  ${unsafeHTML(this.teaserHours)}
                </div>
              `
            : null}
          ${this.hasCtaSlot
            ? html`
                <div class="cta">
                  <slot name="cta"></slot>
                </div>
              `
            : null}
        </div>
      </div>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'outline-teaser': OutlineTeaser;
  }
}
