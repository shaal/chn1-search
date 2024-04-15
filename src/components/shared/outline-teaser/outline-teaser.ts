import { LitElement, html, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { AdoptedStylesheets } from '@phase2/outline-adopted-stylesheets-controller';
import { ResizeController } from '../../../controllers/resize-controller';
import componentStyles from './outline-teaser.css?inline';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { classMap } from 'lit/directives/class-map.js';

/**
 * The Outline Teaser component
 * @element outline-teaser
 * @slot - default slot, used for everything.
 */

@customElement('outline-teaser')
export class OutlineTeaser extends LitElement {
  createRenderRoot() {
    const root = super.createRenderRoot();

    new AdoptedStylesheets(this, componentStyles, this.shadowRoot!);
    return root;
  }

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

  render(): TemplateResult {
    return html` <div
      class="${classMap({
        'teaser': true,
        'has-image': this.teaserImage && this.teaserImage !== '',
        'is-mobile': this.resizeController.currentBreakpointRange === 0,
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

        <div class="body">
          ${this.teaserSnippet
            ? html`${unsafeHTML(this.teaserSnippet)}`
            : html`<slot></slot>`}
          <div class="location-information">
            ${this.querySelector('[slot="address"]') !== null
              ? html`
                  <div class="address">
                    <h4>Location</h4>
                    <slot name="address"></slot>
                  </div>
                `
              : null}
            ${this.querySelector('[slot="hours"]') !== null
              ? html`
                  <div class="hours">
                    <h4>Hours</h4>
                    <slot name="hours"></slot>
                  </div>
                `
              : null}
          </div>
        </div>

        ${this.querySelector('[slot="cta"]') !== null
          ? html`
              <div class="cta">
                <slot name="cta"></slot>
              </div>
            `
          : null}
      </div>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'outline-teaser': OutlineTeaser;
  }
}
