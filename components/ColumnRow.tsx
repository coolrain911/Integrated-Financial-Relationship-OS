import type { ColumnDTO } from "@/lib/types";

export function ColumnRow({
  column,
  onOpen,
}: {
  column: ColumnDTO;
  onOpen: (columnId: number) => void;
}) {
  return (
    <div className="row-card link-cell" onClick={() => onOpen(column.id)}>
      <div className="row-card-top">
        <div>
          <div className="row-name">
            {column.num !== null ? `${column.num}. ` : ""}
            {column.title}
          </div>
        </div>
        <span className="pill success">{(column.category || "").split(",")[0]}</span>
      </div>
    </div>
  );
}
