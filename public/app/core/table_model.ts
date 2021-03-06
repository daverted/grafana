import _ from 'lodash';
import { Column, TableData } from '@grafana/data';

/**
 * Extends the standard Column class with variables that get
 * mutated in the angular table panel.
 */
interface MutableColumn extends Column {
  title?: string;
  sort?: boolean;
  desc?: boolean;
  type?: string;
}

export default class TableModel implements TableData {
  columns: MutableColumn[];
  rows: any[];
  type: string;
  columnMap: any;
  refId: string;

  constructor(table?: any) {
    this.columns = [];
    this.columnMap = {};
    this.rows = [];
    this.type = 'table';

    if (table) {
      if (table.columns) {
        for (const col of table.columns) {
          this.addColumn(col);
        }
      }
      if (table.rows) {
        for (const row of table.rows) {
          this.addRow(row);
        }
      }
    }
  }

  sort(options: { col: number; desc: boolean }) {
    if (options.col === null || this.columns.length <= options.col) {
      return;
    }

    this.rows.sort((a, b) => {
      a = a[options.col];
      b = b[options.col];

      const aIsString = typeof a === 'string';
      const bIsString = typeof b === 'string';

      // account for "3.7K" style numbers
      if (aIsString) {
        const aMatch = a.match(/\d+\.?\d?K/g);
        if (aMatch !== null && a === aMatch[0]) {
          a = a.replace('.', '').replace('K', '000');
        }
      }

      if (bIsString) {
        const bMatch = b.match(/\d+\.?\d?K/g);
        if (bMatch !== null && b === bMatch[0]) {
          b = b.replace('.', '').replace('K', '000');
        }
      }

      const intA = parseInt(a, 10);
      const intB = parseInt(b, 10);

      // by default, sort as int
      let retval = +isNaN(intB) - +isNaN(intA) || +(intA > intB) || -(intA < intB);

      if (aIsString && bIsString) {
        // if string that doesn't start with a number, sort as lower case string (e.g. app name)
        if (isNaN(intA) && isNaN(intB)) {
          retval = a === b ? 0 : a.toLowerCase() < b.toLowerCase() ? 1 : -1;
        }

        if (!isNaN(intA) && !isNaN(intB)) {
          if (intA === intB) {
            // account for "1 (1 p1)"
            const aMatch = a.match(/^\d+\s+\(\d+\sp1\)$/g);
            const bMatch = b.match(/^\d+\s+\(\d+\sp1\)$/g);
            if (aMatch !== null && aMatch[0] === a && bMatch !== null && bMatch[0] === b) {
              const ap1 = parseInt(a.replace(/^\d+\s+\(/g, '').replace(/\sp1\)/g, ''), 10);
              const bp1 = parseInt(b.replace(/^\d+\s+\(/g, '').replace(/\sp1\)/g, ''), 10);
              retval = ap1 === bp1 ? 0 : ap1 < bp1 ? -1 : 1;
            }
          }
        }
      }

      return retval;
    });

    if (options.desc) {
      this.rows.reverse();
    }

    this.columns[options.col].sort = true;
    this.columns[options.col].desc = options.desc;
  }

  addColumn(col: Column) {
    if (!this.columnMap[col.text]) {
      this.columns.push(col);
      this.columnMap[col.text] = col;
    }
  }

  addRow(row: any[]) {
    this.rows.push(row);
  }
}

// Returns true if both rows have matching non-empty fields as well as matching
// indexes where one field is empty and the other is not
function areRowsMatching(columns: Column[], row: any[], otherRow: any[]) {
  let foundFieldToMatch = false;
  for (let columnIndex = 0; columnIndex < columns.length; columnIndex++) {
    if (row[columnIndex] !== undefined && otherRow[columnIndex] !== undefined) {
      if (row[columnIndex] !== otherRow[columnIndex]) {
        return false;
      }
    } else if (row[columnIndex] === undefined || otherRow[columnIndex] === undefined) {
      foundFieldToMatch = true;
    }
  }
  return foundFieldToMatch;
}

export function mergeTablesIntoModel(dst?: TableModel, ...tables: TableModel[]): TableModel {
  const model = dst || new TableModel();

  if (arguments.length === 1) {
    return model;
  }
  // Single query returns data columns and rows as is
  if (arguments.length === 2) {
    model.columns = tables[0].hasOwnProperty('columns') ? [...tables[0].columns] : [];
    model.rows = tables[0].hasOwnProperty('rows') ? [...tables[0].rows] : [];
    return model;
  }

  // Filter out any tables that are not of TableData format
  const tableDataTables = tables.filter(table => !!table.columns);

  // Track column indexes of union: name -> index
  const columnNames: { [key: string]: any } = {};

  // Union of all non-value columns
  const columnsUnion = tableDataTables.slice().reduce(
    (acc, series) => {
      series.columns.forEach(col => {
        const { text } = col;
        if (columnNames[text] === undefined) {
          columnNames[text] = acc.length;
          acc.push(col);
        }
      });
      return acc;
    },
    [] as MutableColumn[]
  );

  // Map old column index to union index per series, e.g.,
  // given columnNames {A: 0, B: 1} and
  // data [{columns: [{ text: 'A' }]}, {columns: [{ text: 'B' }]}] => [[0], [1]]
  const columnIndexMapper = tableDataTables.map(series => series.columns.map(col => columnNames[col.text]));

  // Flatten rows of all series and adjust new column indexes
  const flattenedRows = tableDataTables.reduce(
    (acc, series, seriesIndex) => {
      const mapper = columnIndexMapper[seriesIndex];
      series.rows.forEach(row => {
        const alteredRow: MutableColumn[] = [];
        // Shifting entries according to index mapper
        mapper.forEach((to, from) => {
          alteredRow[to] = row[from];
        });
        acc.push(alteredRow);
      });
      return acc;
    },
    [] as MutableColumn[][]
  );

  // Merge rows that have same values for columns
  const mergedRows: { [key: string]: any } = {};

  const compactedRows = flattenedRows.reduce(
    (acc, row, rowIndex) => {
      if (!mergedRows[rowIndex]) {
        // Look from current row onwards
        let offset = rowIndex + 1;
        // More than one row can be merged into current row
        while (offset < flattenedRows.length) {
          // Find next row that could be merged
          const match = _.findIndex(flattenedRows, otherRow => areRowsMatching(columnsUnion, row, otherRow), offset);
          if (match > -1) {
            const matchedRow = flattenedRows[match];
            // Merge values from match into current row if there is a gap in the current row
            for (let columnIndex = 0; columnIndex < columnsUnion.length; columnIndex++) {
              if (row[columnIndex] === undefined && matchedRow[columnIndex] !== undefined) {
                row[columnIndex] = matchedRow[columnIndex];
              }
            }
            // Don't visit this row again
            mergedRows[match] = matchedRow;
            // Keep looking for more rows to merge
            offset = match + 1;
          } else {
            // No match found, stop looking
            break;
          }
        }
        acc.push(row);
      }
      return acc;
    },
    [] as MutableColumn[][]
  );

  model.columns = columnsUnion;
  model.rows = compactedRows;
  return model;
}
