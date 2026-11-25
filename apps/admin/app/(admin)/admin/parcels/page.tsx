'use client';

import React, { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api-client';
import { ParcelStatsCards } from '@/components/parcels/ParcelStatsCards';
import { ParcelsTable } from '@/components/parcels/ParcelsTable';
import { ParcelRestrictionsTable } from '@/components/parcels/ParcelRestrictionsTable';
import { ParcelServicesTable } from '@/components/parcels/ParcelServicesTable';
import { ParcelModals } from '@/components/parcels/ParcelModals';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@allgo/ui';
import { Button } from '@allgo/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { RefreshIcon } from '@hugeicons/core-free-icons';

export default function ParcelsPage() {
  const [activeTab, setActiveTab] = useState<'parcels' | 'restrictions' | 'services'>('parcels');
  const [stats, setStats] = useState<any>(null);
  const [parcels, setParcels] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [restrictions, setRestrictions] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [selectedParcel, setSelectedParcel] = useState<any>(null);
  const [isForceModalOpen, setIsForceModalOpen] = useState<boolean>(false);
  const [forceTargetStatus, setForceTargetStatus] = useState<string>('DELIVERED');
  const [forceReason, setForceReason] = useState<string>('');
  const [submittingForce, setSubmittingForce] = useState<boolean>(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsRes, listRes, restRes, srvRes] = await Promise.all([
        adminApi.getParcelStats(),
        adminApi.listAdminParcels({
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          search: searchQuery || undefined,
        }),
        adminApi.getParcelRestrictions(),
        adminApi.getParcelServices(),
      ]);

      setStats(statsRes);
      setParcels(listRes.parcels || []);
      setTotalCount(listRes.total || 0);
      setRestrictions(restRes || []);
      setServices(srvRes || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch parcel operations data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Parcel & Courier Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Authoritative parcel bookings, assignment dispatch, Dual OTP verification and restricted goods governance
          </p>
        </div>
        <Button
          onClick={fetchData}
          disabled={loading}
          variant="outline"
          size="sm"
          className="gap-2 cursor-pointer self-start sm:self-auto"
        >
          <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      <ParcelStatsCards stats={stats} totalCount={totalCount} />

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="parcels">
            All Parcel Bookings ({totalCount})
          </TabsTrigger>
          <TabsTrigger value="restrictions">
            Package Restrictions & Policies ({restrictions.length})
          </TabsTrigger>
          <TabsTrigger value="services">
            Service Tiers & Multipliers ({services.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="parcels">
          <ParcelsTable
            parcels={parcels}
            loading={loading}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            onSearchSubmit={handleSearchSubmit}
            onInspect={(p) => setSelectedParcel(p)}
            onOpenForce={(p) => {
              setSelectedParcel(p);
              setIsForceModalOpen(true);
            }}
          />
        </TabsContent>

        <TabsContent value="restrictions">
          <ParcelRestrictionsTable restrictions={restrictions} onRefresh={fetchData} />
        </TabsContent>

        <TabsContent value="services">
          <ParcelServicesTable services={services} onRefresh={fetchData} />
        </TabsContent>
      </Tabs>

      <ParcelModals
        selectedParcel={selectedParcel}
        onCloseDetails={() => setSelectedParcel(null)}
        isForceModalOpen={isForceModalOpen}
        onCloseForce={() => setIsForceModalOpen(false)}
        forceTargetStatus={forceTargetStatus}
        setForceTargetStatus={setForceTargetStatus}
        forceReason={forceReason}
        setForceReason={setForceReason}
        submittingForce={submittingForce}
        setSubmittingForce={setSubmittingForce}
        onRefresh={fetchData}
      />
    </div>
  );
}
