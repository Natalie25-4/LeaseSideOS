interface Column<T> {
  header: string;
  render: (row: T) => React.ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
}

export function Table<T>({ columns, data, keyField }: TableProps<T>) {
  return (
    <table className="w-full text-sm text-left">
      <thead>
        <tr className="border-b border-border">
          {columns.map((col) => (
            <th key={col.header} className="py-2 px-3 font-medium text-gray-500">
              {col.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={String(row[keyField])} className="border-b border-border hover:bg-gray-50">
            {columns.map((col) => (
              <td key={col.header} className="py-3 px-3 text-charcoal">
                {col.render(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}