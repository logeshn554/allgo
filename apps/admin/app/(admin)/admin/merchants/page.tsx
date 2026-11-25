'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api-client';
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
import { CheckmarkCircle01Icon, CancelCircleIcon } from '@hugeicons/core-free-icons';
import { Button } from '@allgo/ui';
import { Input } from '@allgo/ui';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@allgo/ui';

const MERCHANT_STATUS_ITEMS = {
  ALL: 'All Statuses',
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED (Pending Review)',
  ACTIVE: 'ACTIVE (Approved)',
  SUSPENDED: 'SUSPENDED',
  REJECTED: 'REJECTED',
};

export default function MerchantsListPage() {
  const [merchants, setMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetchMerchants = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getMerchants(filterStatus || undefined);
      setMerchants((data as any).merchants || (Array.isArray(data) ? data : []));
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch merchants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMerchants();
  }, [filterStatus]);

  const filtered = merchants.filter(
    (m) =>
      m.business_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.outlet_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.phone?.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Merchant Partners Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review onboarding requests, manage outlets, verify FSSAI compliance, and approve documents.
          </p>
        </div>
        <Button onClick={fetchMerchants}>
          Refresh Merchants
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          type="text"
          placeholder="Search by business name, outlet, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />
        <Select
          value={filterStatus || 'ALL'}
          items={MERCHANT_STATUS_ITEMS}
          onValueChange={(val) => setFilterStatus(val === 'ALL' ? '' : (val ?? ''))}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="DRAFT">DRAFT</SelectItem>
              <SelectItem value="SUBMITTED">SUBMITTED (Pending Review)</SelectItem>
              <SelectItem value="ACTIVE">ACTIVE (Approved)</SelectItem>
              <SelectItem value="SUSPENDED">SUSPENDED</SelectItem>
              <SelectItem value="REJECTED">REJECTED</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 text-sm">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-md border border-border">
        <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business & Outlet</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Compliance</TableHead>
                <TableHead>Owner Contact</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-end">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    Loading merchant applications...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No merchant applications found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div className="font-semibold text-foreground">{m.business_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {m.outlet_name || 'No Outlet Defined'} • {m.postal_code || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-muted text-foreground">
                        {m.vertical_type || 'RESTAURANT'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        {m.fssai_license_number ? (
                          <span className="text-primary font-medium flex items-center gap-1">
                            <HugeiconsIcon icon={CheckmarkCircle01Icon} strokeWidth={2} className="size-3.5" />
                            <span>FSSAI: {m.fssai_license_number}</span>
                          </span>
                        ) : (
                          <span className="text-destructive font-medium flex items-center gap-1">
                            <HugeiconsIcon icon={CancelCircleIcon} strokeWidth={2} className="size-3.5" />
                            <span>No FSSAI</span>
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        GST: {m.gstin || 'Unregistered'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">{m.contact_name || 'Authorized Signatory'}</div>
                      <div className="text-xs text-muted-foreground">{m.phone}</div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={m.status} />
                    </TableCell>
                    <TableCell className="text-end">
                      <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/admin/merchants/${m.id}`} />}>
                        Review & Manage
                      </Button>
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
