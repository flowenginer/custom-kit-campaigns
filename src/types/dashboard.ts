export type WidgetType = 'metric' | 'chart' | 'table' | 'progress';

export type ChartType = 'bar' | 'line' | 'area' | 'pie' | 'donut';

export type AggregationType = 'count' | 'sum' | 'avg' | 'min' | 'max';

export type FilterOperator = '=' | '!=' | '>' | '<' | '>=' | '<=' | 'like' | 'ilike' | 'in';

export interface WidgetFilter {
  field: string;
  operator: FilterOperator;
  value: string | number | boolean | string[];
}

export interface QueryConfig {
  table: string;
  field: string;
  aggregation?: AggregationType;
  groupBy?: string;
  filters?: WidgetFilter[];
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  limit?: number;
}

export interface DisplayConfig {
  title: string;
  color?: string;
  format?: 'number' | 'currency' | 'percent';
  prefix?: string;
  suffix?: string;
  chartType?: ChartType;
  showLegend?: boolean;
  showGrid?: boolean;
  target?: number;
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
  position: WidgetPosition;
  query_config: QueryConfig;
  display_config: DisplayConfig;
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  is_public: boolean;
  widgets: Widget[];
  created_at: string;
  updated_at: string;
}
