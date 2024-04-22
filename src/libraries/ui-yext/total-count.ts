import { html } from 'lit-html';

export const TotalCount = ({
  totalCount,
  limit,
  offset,
}: {
  totalCount: number | null;
  limit: number | null;
  offset: number | string;
}) => {
  if (!totalCount) {
    return;
  }

  const range1 = parseInt(offset.toString()) + 1;
  const range2 = Math.min(
    parseInt(offset.toString()) + (limit ?? 0),
    totalCount
  );

  return html`<div class="total-count">
    <strong>${range1}-${range2}</strong> of ${totalCount} results
  </div>`;
};

export default TotalCount;
