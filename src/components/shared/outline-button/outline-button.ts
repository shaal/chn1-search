import { LitElement, html, TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { AdoptedStylesheets } from '@phase2/outline-adopted-stylesheets-controller';
import componentStyles from './outline-button.css?inline';

/**
 * The Outline Button component
 * @element outline-button
 */

@customElement('outline-button')
export class OutlineButton extends LitElement {
  createRenderRoot() {
    const root = super.createRenderRoot();
    // this.EncapsulatedStylesheets = this.shadowRoot
    //   ? new AdoptedStylesheets(this, componentStyles, this.shadowRoot)
    //   : undefined;
    new AdoptedStylesheets(this, componentStyles, this.shadowRoot!);
    return root;
  }

  @property({ type: String, attribute: 'button-url' })
  buttonUrl: string | undefined;

  @property({ type: String, attribute: 'button-title' })
  buttonTitle: string | undefined;

  render(): TemplateResult {
    return this.buttonTitle && this.buttonUrl
      ? html` <a href="${this.buttonUrl}" class="btn">${this.buttonTitle}</a> `
      : html``;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'outline-button': OutlineButton;
  }
}
