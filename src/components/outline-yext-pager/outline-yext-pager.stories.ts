import { html, TemplateResult } from 'lit';
// import { unsafeHTML } from 'lit/directives/unsafe-html.js';

import './outline-yext-pager';

export default {
  title: 'Content/Yext/Pager',
  component: 'outline-yext-pager',
  argTypes: {},
  args: {},
};

const Template = (): TemplateResult =>
  html`
    <outline-yext-pager
      current-page="5"
      total-pages="20"
      max-pages-in-pager="5"
    ></outline-yext-pager>
  `;

export const YextPager = Template.bind({});
// YextPager.args = {};
