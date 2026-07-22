import type { ColumnDTO } from "@/lib/types";

export function ColumnRow({ column }: { column: ColumnDTO }) {
  return (
    <div className="row-card">
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
