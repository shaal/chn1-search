import { html, TemplateResult } from 'lit';
import './outline-yext'


export default {
  title: 'Content/Yext/Yext (list)',
  component: 'outline-yext',
};

const Template = (): TemplateResult =>
  html`
    <outline-yext debug></outline-yext>
  `;

export const OutlineYext = Template.bind({});

const TemplateMenu = (): TemplateResult =>
  html`
  <outline-header debug-menu="true"></outline-header>
    <outline-yext debug></outline-yext>
  `;

export const OutlineYextWithMenu = TemplateMenu.bind({});
