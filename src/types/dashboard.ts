export type WidgetType = 'metric' | 'chart' | 'table' | 'progress';
export type ChartType = 'bar' | 'line' | 'area' | 'pie' | 'donut';
export type AggregationType = 'count' | 'sum' | 'avg' | 'min' | 'max';
export type FilterOperator = 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'like' | 'in';

export interface WidgetFilter {
  field: string;
  operator: FilterOperator;
  value: string | number;
}

export interface QueryConfig {
  dataSourceId: string;
  tableName: string;
  fields: string[];
  aggregation?: {
    type: AggregationType;
    field: string;
  };
  groupBy?: string;
  filters?: WidgetFilter[];
  limit?: number;
}

export interface DisplayConfig {
  title: string;
  description?: string;
  chartType?: ChartType;
  colors?: string[];
  numberFormat?: 'number' | 'currency' | 'percent';
  decimalPlaces?: number;
  showLegend?: boolean;
  showTooltip?: boolean;
  goal?: number;
}

export interface WidgetPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Widget {
  id: string;
  type: WidgetType;
  queryConfig: QueryConfig;
  displayConfig: DisplayConfig;
  position: WidgetPosition;
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  widgets: Widget[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}
