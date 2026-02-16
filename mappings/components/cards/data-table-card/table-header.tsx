import { TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DataRow } from "@/features/mappings/lib/types";
import {
  flexRender,
  type Header,
  type HeaderGroup,
  type Table,
} from "@tanstack/react-table";
import { memo } from "react";

const TableHeaderComponent = memo<{ table: Table<DataRow> }>(({ table }) => (
  <TableHeader>
    {table.getHeaderGroups().map((headerGroup: HeaderGroup<DataRow>) => (
      <TableRow key={headerGroup.id}>
        {headerGroup.headers.map((header: Header<DataRow, unknown>) => (
          <TableHead key={header.id} className="font-medium">
            {header.isPlaceholder
              ? null
              : flexRender(header.column.columnDef.header, header.getContext())}
          </TableHead>
        ))}
        <TableHead className="w-12">Actions</TableHead>
      </TableRow>
    ))}
  </TableHeader>
));

export { TableHeaderComponent as TableHeader };
