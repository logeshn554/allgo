'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { adminApi } from '@/lib/api-client';
import { StatusBadge } from '@allgo/ui';
import { Button } from '@allgo/ui';
import { Badge } from '@allgo/ui';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@allgo/ui';

export default function PartnersListPage() {
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('SUBMITTED');

  const fetchPartners = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getPartners(filterStatus || undefined);
      setPartners(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch partner applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartners();
  }, [filterStatus]);

  const tabs = [
    { label: 'Pending Verification', value: 'SUBMITTED' },
    { label: 'Active Fleets', value: 'ACTIVE' },
    { label: 'Draft Applications', value: 'DRAFT' },
    { label: 'Suspended Partners', value: 'SUSPENDED' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Delivery Partner Fleet Approvals
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review background verification, driving licenses, vehicle RCs, and onboard delivery riders.
          </p>
        </div>
        <Button onClick={fetchPartners}>
          Refresh Applications
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-border pb-2 overflow-x-auto">
        {tabs.map((tab) => (
          <Button
            key={tab.value}
            variant={filterStatus === tab.value ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setFilterStatus(tab.value)}
          >
            {tab.label}
          </Button>
        ))}
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
                <TableHead>Partner ID / User</TableHead>
                <TableHead>Vehicle Type & Plate</TableHead>
                <TableHead>Bank Status</TableHead>
                <TableHead>KYC Status</TableHead>
                <TableHead>Submitted Date</TableHead>
                <TableHead className="text-end">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    Loading partner applications...
                  </TableCell>
                </TableRow>
              ) : partners.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No partner onboarding applications found for status: {filterStatus}
                  </TableCell>
                </TableRow>
              ) : (
                partners.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-semibold text-foreground">{p.full_name || 'Delivery Partner'}</div>
                      <div className="text-xs text-muted-foreground">{p.phone || p.id}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">{p.vehicle?.vehicle_type || 'MOTORCYCLE'}</div>
                      <div className="text-xs text-muted-foreground">{p.vehicle?.registration_number || 'TN 01 AB 1234'}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                        Encrypted (AES-256)
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={p.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {p.created_at ? new Date(p.created_at).toLocaleDateString() : 'Recent'}
                    </TableCell>
                    <TableCell className="text-end">
                      <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/admin/partners/${p.id}`} />}>
                        Inspect Dossier
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
