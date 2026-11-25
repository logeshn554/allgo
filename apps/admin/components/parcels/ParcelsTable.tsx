'use client';

import React from 'react';
import Link from 'next/link';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
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

const PARCEL_STATUS_ITEMS = {
  ALL: 'All Statuses',
  BOOKED: 'Booked',
  SEARCHING_FOR_PARTNER: 'Searching for Partner',
  PARTNER_ASSIGNED: 'Partner Assigned',
  ARRIVING_AT_PICKUP: 'Arriving at Pickup',
  PICKED_UP: 'Picked Up',
  IN_TRANSIT: 'In Transit',
  ARRIVING_AT_DESTINATION: 'Arriving at Destination',
  DELIVERED: 'Delivered',
  DELIVERY_FAILED: 'Delivery Failed',
  RETURN_INITIATED: 'Return Initiated',
  RETURNED_TO_SENDER: 'Returned to Sender',
  CANCELLED: 'Cancelled',
};

const PARCEL_TIER_ITEMS = {
  ALL: 'All Tiers',
  STANDARD: 'Standard',
  EXPRESS: 'Express',
  SAME_DAY: 'Same Day',
};

interface ParcelsTableProps {
  parcels: any[];
  loading?: boolean;
  isLoading?: boolean;
  searchTerm?: string;
  searchQuery?: string;
  setSearchTerm?: (val: string) => void;
  setSearchQuery?: (val: string) => void;
  statusFilter: string;
  setStatusFilter: (val: string) => void;
  serviceTypeFilter?: string;
  setServiceTypeFilter?: (val: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  onInspect?: (p: any) => void;
  onOpenForce?: (p: any) => void;
}

export function ParcelsTable({
  parcels,
  loading,
  isLoading,
  searchTerm,
  searchQuery,
  setSearchTerm,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  serviceTypeFilter = '',
  setServiceTypeFilter,
  onSearchSubmit,
  onInspect,
  onOpenForce,
}: ParcelsTableProps) {
  const currentSearch = searchTerm ?? searchQuery ?? '';
  const setSearch = setSearchTerm ?? setSearchQuery ?? (() => {});
  const isTableLoading = loading ?? isLoading ?? false;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <form onSubmit={onSearchSubmit} className="flex gap-2 flex-1 w-full">
            <Input
              type="text"
              placeholder="Search tracking #, customer phone, recipient..."
              value={currentSearch}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" size="sm">
              Search
            </Button>
          </form>

          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Select
              value={statusFilter}
              items={PARCEL_STATUS_ITEMS}
              onValueChange={(val) => setStatusFilter(val ?? 'ALL')}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="BOOKED">Booked</SelectItem>
                  <SelectItem value="SEARCHING_FOR_PARTNER">Searching for Partner</SelectItem>
                  <SelectItem value="PARTNER_ASSIGNED">Partner Assigned</SelectItem>
                  <SelectItem value="ARRIVING_AT_PICKUP">Arriving at Pickup</SelectItem>
                  <SelectItem value="PICKED_UP">Picked Up</SelectItem>
                  <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                  <SelectItem value="ARRIVING_AT_DESTINATION">Arriving at Destination</SelectItem>
                  <SelectItem value="DELIVERED">Delivered</SelectItem>
                  <SelectItem value="DELIVERY_FAILED">Delivery Failed</SelectItem>
                  <SelectItem value="RETURN_INITIATED">Return Initiated</SelectItem>
                  <SelectItem value="RETURNED_TO_SENDER">Returned to Sender</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            {setServiceTypeFilter && (
              <Select
                value={serviceTypeFilter || 'ALL'}
                items={PARCEL_TIER_ITEMS}
                onValueChange={(val) => setServiceTypeFilter(val === 'ALL' ? '' : (val ?? ''))}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="All Tiers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="ALL">All Tiers</SelectItem>
                    <SelectItem value="STANDARD">Standard</SelectItem>
                    <SelectItem value="EXPRESS">Express</SelectItem>
                    <SelectItem value="SAME_DAY">Same Day</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            )}
          </div>
      </div>

      <div className="overflow-hidden rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>TRACKING #</TableHead>
              <TableHead>SERVICE & SPECS</TableHead>
              <TableHead>SENDER / PICKUP</TableHead>
              <TableHead>RECIPIENT / DROP</TableHead>
              <TableHead>PARTNER</TableHead>
              <TableHead>FEE (₹)</TableHead>
              <TableHead>STATUS</TableHead>
              <TableHead className="text-end">ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isTableLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-muted-foreground text-sm">
                  Loading parcel records...
                </TableCell>
              </TableRow>
            ) : parcels.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center text-muted-foreground text-sm">
                  No parcel bookings found matching criteria.
                </TableCell>
              </TableRow>
            ) : (
              parcels.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-bold text-foreground">
                    {p.tracking_number || p.trackingNumber || p.id.slice(0, 8)}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">{p.service_type || p.serviceType}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {p.package_category || p.packageCategory} · {p.estimated_weight_kg || p.weightKg} kg
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">{p.sender_name || p.senderName}</div>
                    <div className="text-[11px] text-muted-foreground max-w-[200px] truncate">
                      {p.pickup_address || p.pickupAddress}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-foreground">{p.recipient_name || p.recipientName}</div>
                    <div className="text-[11px] text-muted-foreground max-w-[200px] truncate">
                      {p.drop_address || p.dropAddress}
                    </div>
                  </TableCell>
                  <TableCell>
                    {p.partner_id ? (
                      <div>
                        <span className="font-medium text-foreground">Assigned</span>
                        <div className="text-[11px] text-muted-foreground">{p.partner_name || p.partner_id.slice(0, 8)}</div>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">Unassigned</span>
                    )}
                  </TableCell>
                  <TableCell className="font-bold text-foreground">
                    ₹{Number(p.total_amount_inr || p.totalAmountInr || 0).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={p.status} />
                  </TableCell>
                  <TableCell className="text-end">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/admin/parcels/${p.id}`} />}>
                        Inspect
                      </Button>
                      {onOpenForce && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onOpenForce(p)}
                        >
                          Force Status
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
