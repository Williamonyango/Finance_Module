import { ChevronLeft, ChevronRight } from "lucide-react";

export function PaginationControls({
  page,
  pageCount,
  total,
  visibleCount,
  pageSize = 5,
  onPage,
  showRange = visibleCount === undefined,
  iconArrows = true,
}) {
  const summary = showRange
    ? `Showing ${total === 0 ? 0 : (page - 1) * pageSize + 1}–${Math.min(
        page * pageSize,
        total,
      )} of ${total}`
    : `Showing ${visibleCount} of ${total}`;

  return (
    <div className="pagination">
      <span>{summary}</span>
      <div>
        <button
          disabled={page === 1}
          onClick={() => onPage((value) => value - 1)}
        >
          {iconArrows ? <ChevronLeft size={16} /> : "‹"}
        </button>
        <strong>
          {page} / {pageCount}
        </strong>
        <button
          disabled={page === pageCount}
          onClick={() => onPage((value) => value + 1)}
        >
          {iconArrows ? <ChevronRight size={16} /> : "›"}
        </button>
      </div>
    </div>
  );
}
