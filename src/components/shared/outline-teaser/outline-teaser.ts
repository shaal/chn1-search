import { LitElement, html, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { AdoptedStylesheets } from '@phase2/outline-adopted-stylesheets-controller';
import componentStyles from './outline-teaser.css?inline';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

/**
 * The Outline Teaser component
 * @element outline-teaser
 * @slot - default slot, used for everything.
 */

@customElement('outline-teaser')
export class OutlineTeaser extends LitElement {
  createRenderRoot() {
    const root = super.createRenderRoot();
    // this.EncapsulatedStylesheets = this.shadowRoot
    //   ? new AdoptedStylesheets(this, componentStyles, this.shadowRoot)
    //   : undefined;
    new AdoptedStylesheets(this, componentStyles, this.shadowRoot!);
    return root;
  }

  @property({ type: String, attribute: 'image' })
  teaserImage: string | undefined;

  @property({ type: String, attribute: 'url' })
  teaserUrl: string | undefined;

  @property({ type: String, attribute: 'title' })
  teaserTitle: string | undefined;

  @property({ type: String, attribute: 'snippet' })
  teaserSnippet: string | undefined;

  render(): TemplateResult {
    return html` <div class="teaser ${this.teaserImage ? 'has-image' : ''}">
      ${this.teaserImage
        ? html`
            <div class="image">
              <img src="${this.teaserImage}" alt="${this.teaserTitle}" />
            </div>
          `
        : null}

      <div>
        <h3 class="title">
          <a href="${window.location.origin}/node/${this.teaserUrl}}"
            >${unsafeHTML(this.teaserTitle)}</a
          >
        </h3>
        <div class="body">
          ${this.teaserSnippet
            ? html`${unsafeHTML(this.teaserSnippet)}`
            : html`<slot></slot>`}
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
