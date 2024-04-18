import { html } from 'lit-html';

export const TotalCount = ({
  totalCount,
  limit,
  offset,
}: {
  totalCount: number | null;
  limit: number | null;
  offset: number;
}) => {
  if (!totalCount) {
    return;
  }

  const range1 = offset + 1;
  const range2 = Math.min(offset + (limit ?? 0), totalCount);

  return html`<div class="total-count">
    Showing <strong>${range1}-${range2}</strong> of ${totalCount} results
  </div>`;
};

export default TotalCount;
