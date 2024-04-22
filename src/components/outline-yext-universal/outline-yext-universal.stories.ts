import { html, TemplateResult } from 'lit';
import './outline-yext-universal';

export default {
  title: 'Content/Yext/Universal Search',
  component: 'outline-yext-universal',
};

const Template = (): TemplateResult =>
  html` <outline-yext-universal debug></outline-yext-universal> `;

export const UniversalSearch = Template.bind({});
