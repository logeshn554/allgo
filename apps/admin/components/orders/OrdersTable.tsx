'use client';

import React, { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnDef,
} from '@tanstack/react-table';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@allgo/ui';
import { Input } from '@allgo/ui';
import { Button } from '@allgo/ui';
import { StatusBadge } from '@allgo/ui';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
} from '@allgo/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Search01Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  FilterIcon,
  ViewIcon,
} from '@hugeicons/core-free-icons';

interface OrderItem {
  id: string;
  sub_order_number: string;
  order_group_number: string;
  outlet_name: string;
  business_name: string;
  customer_name: string;
  customer_phone: string;
  total_payable_inr?: number;
  items_total_inr?: number;
  status: string;
  created_at: string;
}

interface OrdersTableProps {
  orders: OrderItem[];
  isLoadingOrders: boolean;
  ordersError: string | null;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  onInspectOrder: (orderId: string) => void;
}

const ORDER_STATUS_ITEMS = {
  ALL: 'All Statuses',
  PLACED: 'Placed',
  MERCHANT_ACCEPTED: 'Accepted',
  PREPARING: 'Preparing',
  READY: 'Ready',
  DISPATCHED: 'Out for Delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

const PAGE_SIZE_ITEMS = {
  '10': '10',
  '20': '20',
  '50': '50',
};

export function OrdersTable({
  orders,
  isLoadingOrders,
  ordersError,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  onInspectOrder,
}: OrdersTableProps) {
  const [pageSize, setPageSize] = useState<number>(10);

  // Filter orders by global search and status dropdown
  const filteredOrders = useMemo(() => {
    return (orders || []).filter((o) => {
      // Status filter
      if (statusFilter && statusFilter !== 'ALL' && o.status !== statusFilter) {
        return false;
      }
      // Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (o.sub_order_number || '').toLowerCase().includes(q) ||
        (o.order_group_number || '').toLowerCase().includes(q) ||
        (o.customer_name || '').toLowerCase().includes(q) ||
        (o.customer_phone || '').toLowerCase().includes(q) ||
        (o.outlet_name || '').toLowerCase().includes(q) ||
        (o.business_name || '').toLowerCase().includes(q)
      );
    });
  }, [orders, searchQuery, statusFilter]);

  // Define columns for TanStack Table
  const columns = useMemo<ColumnDef<OrderItem>[]>(
    () => [
      {
        accessorKey: 'sub_order_number',
        header: 'Order / Group #',
        cell: ({ row }) => {
          const ord = row.original;
          return (
            <div>
              <span className="font-semibold text-foreground">{ord.sub_order_number}</span>
              <div className="text-[11px] text-muted-foreground">{ord.order_group_number}</div>
            </div>
          );
        },
      },
      {
        accessorKey: 'outlet_name',
        header: 'Restaurant / Outlet',
        cell: ({ row }) => {
          const ord = row.original;
          return (
            <div>
              <span className="font-medium text-foreground">{ord.outlet_name}</span>
              <div className="text-xs text-muted-foreground">{ord.business_name}</div>
            </div>
          );
        },
      },
      {
        accessorKey: 'customer_name',
        header: 'Customer',
        cell: ({ row }) => {
          const ord = row.original;
          return (
            <div>
              <span className="font-medium text-foreground">{ord.customer_name}</span>
              <div className="text-xs text-muted-foreground">{ord.customer_phone}</div>
            </div>
          );
        },
      },
      {
        accessorKey: 'total_payable_inr',
        header: 'Amount (INR)',
        cell: ({ row }) => {
          const ord = row.original;
          const amt = Number(ord.total_payable_inr ?? ord.items_total_inr ?? 0).toFixed(2);
          return <span className="font-semibold text-foreground">₹{amt}</span>;
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'created_at',
        header: 'Date & Time',
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {new Date(row.original.created_at).toLocaleString()}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <div className="text-end">Actions</div>,
        cell: ({ row }) => (
          <div className="text-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onInspectOrder(row.original.id)}
              className="cursor-pointer gap-1.5"
            >
              <HugeiconsIcon icon={ViewIcon} strokeWidth={2} className="size-3.5" />
              <span>Inspect</span>
            </Button>
          </div>
        ),
      },
    ],
    [onInspectOrder]
  );

  const table = useReactTable({
    data: filteredOrders,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: {
        pageSize: pageSize,
      },
    },
  });

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full sm:w-auto">
          <HugeiconsIcon
            icon={Search01Icon}
            strokeWidth={2}
            className="absolute start-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none"
          />
          <Input
            type="text"
            placeholder="Search by Order #, Customer, Phone, or Outlet..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-9 w-full"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <HugeiconsIcon
            icon={FilterIcon}
            strokeWidth={2}
            className="size-4 text-muted-foreground hidden sm:inline-block"
          />
          <Select
            value={statusFilter}
            items={ORDER_STATUS_ITEMS}
            onValueChange={(val) => setStatusFilter(val ?? 'ALL')}
          >
            <SelectTrigger className="w-full sm:w-[190px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="PLACED">Placed</SelectItem>
                <SelectItem value="MERCHANT_ACCEPTED">Accepted</SelectItem>
                <SelectItem value="PREPARING">Preparing</SelectItem>
                <SelectItem value="READY">Ready</SelectItem>
                <SelectItem value="DISPATCHED">Out for Delivery</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Orders Table */}
      {isLoadingOrders ? (
        <div className="rounded-md border border-border bg-card py-12 text-center text-muted-foreground text-sm">
          Loading orders...
        </div>
      ) : ordersError ? (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {ordersError}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="rounded-md border border-border bg-card p-12 text-center text-muted-foreground text-sm">
          No matching orders found.
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground">
            <div>
              Showing{' '}
              <span className="font-medium text-foreground">
                {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
              </span>{' '}
              to{' '}
              <span className="font-medium text-foreground">
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                  filteredOrders.length
                )}
              </span>{' '}
              of <span className="font-medium text-foreground">{filteredOrders.length}</span> orders
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span>Rows per page:</span>
                <Select
                  value={String(pageSize)}
                  items={PAGE_SIZE_ITEMS}
                  onValueChange={(val) => {
                    const newSize = Number(val ?? '10');
                    setPageSize(newSize);
                    table.setPageSize(newSize);
                  }}
                >
                  <SelectTrigger size="sm" className="w-[70px] text-xs">
                    <SelectValue placeholder={String(pageSize)} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1">
                <span>
                  Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1}
                </span>
                <div className="flex items-center gap-1 ms-2">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-3.5 rtl:rotate-180" />
                    <span className="sr-only">Previous Page</span>
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-3.5 rtl:rotate-180" />
                    <span className="sr-only">Next Page</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
