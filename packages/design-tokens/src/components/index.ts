/**
 * Vote Capsule™ Shared Component Type Definitions
 *
 * These are interface/type definitions only — no React dependency.
 * Actual component implementations live in each portal's codebase.
 * This ensures consistent prop contracts across all 6 web portals.
 */

// ─── Status Badge ────────────────────────────────────────────────────────────

/** Evidence capsule lifecycle statuses */
export type CapsuleStatus =
  | 'verified'
  | 'pending'
  | 'rejected'
  | 'reviewing'
  | 'offline';

/** Status badge size variants */
export type BadgeSize = 'sm' | 'md' | 'lg';

/** Props for the StatusBadge component */
export interface StatusBadgeProps {
  /** Current status to display */
  status: CapsuleStatus;
  /** Optional size variant (default: 'md') */
  size?: BadgeSize;
  /** Optional label override (default: derived from status) */
  label?: string;
  /** Optional: show pulse animation for active states */
  pulse?: boolean;
  /** Optional: additional CSS class names */
  className?: string;
}

// ─── Card ────────────────────────────────────────────────────────────────────

/** Trend direction for metric cards */
export type TrendDirection = 'up' | 'down' | 'flat';

/** Props for metric/summary cards */
export interface CardProps {
  /** Card heading */
  title: string;
  /** Optional supporting text below title */
  subtitle?: string;
  /** Primary numeric value to display */
  metric?: string | number;
  /** Optional trend indicator */
  trend?: {
    direction: TrendDirection;
    value: string;
    label?: string;
  };
  /** Optional icon identifier (portal-specific icon set) */
  icon?: string;
  /** Optional: additional CSS class names */
  className?: string;
  /** Optional: click handler */
  onClick?: () => void;
}

// ─── Data Table ──────────────────────────────────────────────────────────────

/** Alignment options for table columns */
export type ColumnAlignment = 'left' | 'center' | 'right';

/** Sort direction */
export type SortDirection = 'asc' | 'desc' | null;

/** Column definition for data tables */
export interface DataTableColumn<T = Record<string, unknown>> {
  /** Unique column identifier */
  id: string;
  /** Display header text */
  header: string;
  /** Property key on the row data (or accessor function) */
  accessor: keyof T | ((row: T) => unknown);
  /** Column width (CSS value) */
  width?: string;
  /** Minimum width (CSS value) */
  minWidth?: string;
  /** Text alignment (default: 'left') */
  align?: ColumnAlignment;
  /** Whether column is sortable (default: false) */
  sortable?: boolean;
  /** Whether column is visible (default: true) */
  visible?: boolean;
  /** Optional: render function for custom cell display */
  render?: (value: unknown, row: T) => unknown;
}

/** Props for the DataTable component */
export interface DataTableProps<T = Record<string, unknown>> {
  /** Column definitions */
  columns: DataTableColumn<T>[];
  /** Row data */
  data: T[];
  /** Optional: unique key for each row */
  rowKey?: keyof T | ((row: T) => string);
  /** Optional: loading state */
  loading?: boolean;
  /** Optional: empty state message */
  emptyMessage?: string;
  /** Optional: enable row selection */
  selectable?: boolean;
  /** Optional: selected row keys */
  selectedKeys?: string[];
  /** Optional: selection change handler */
  onSelectionChange?: (keys: string[]) => void;
  /** Optional: sort state */
  sortColumn?: string;
  /** Optional: sort direction */
  sortDirection?: SortDirection;
  /** Optional: sort change handler */
  onSort?: (column: string, direction: SortDirection) => void;
  /** Optional: pagination page size */
  pageSize?: number;
  /** Optional: current page (0-indexed) */
  page?: number;
  /** Optional: total row count (for server-side pagination) */
  totalRows?: number;
  /** Optional: page change handler */
  onPageChange?: (page: number) => void;
  /** Optional: additional CSS class names */
  className?: string;
}
