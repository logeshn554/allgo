'use client';

import React, { useState, useEffect } from 'react';
import { adminApi } from '../../../lib/api-client';
import { ParcelStatsCards } from '../../../components/parcels/ParcelStatsCards';
import { ParcelsTable } from '../../../components/parcels/ParcelsTable';
import { ParcelRestrictionsTable } from '../../../components/parcels/ParcelRestrictionsTable';
import { ParcelServicesTable } from '../../../components/parcels/ParcelServicesTable';

export default function AdminParcelsPage() {
  const [activeTab, setActiveTab] = useState<'parcels' | 'restrictions' | 'services'>('parcels');

  const [parcels, setParcels] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [stats, setStats] = useState<any>({ total: 0, delivered: 0, inTransit: 0, failedOrReturned: 0 });
  const [restrictions, setRestrictions] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);

  const [statusFilter, setStatusFilter] = useState('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [parcelsRes, statsRes, restRes, servRes] = await Promise.all([
        adminApi.listAdminParcels({
          status: statusFilter || undefined,
          serviceType: serviceTypeFilter || undefined,
          search: searchTerm || undefined,
        }).catch(() => []),
        adminApi.getAdminParcelStats().catch(() => ({ total: 0, delivered: 0, inTransit: 0, failedOrReturned: 0 })),
        adminApi.getAdminParcelRestrictions().catch(() => []),
        adminApi.getAdminParcelServices().catch(() => []),
      ]);

      const parcelList = Array.isArray(parcelsRes) ? parcelsRes : (parcelsRes?.parcels || []);
      const total = Array.isArray(parcelsRes) ? parcelList.length : ((parcelsRes as any)?.total ?? parcelList.length);
      setParcels(parcelList);
      setTotalCount(total);
      setStats(statsRes || {});
      setRestrictions(restRes || []);
      setServices(servRes || []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load parcel data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [statusFilter, serviceTypeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <div style={{ marginBottom: '28px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '800', color: '#0F172A', margin: 0 }}>
            Parcel & Courier Management
          </h1>
          <p style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>
            Authoritative parcel bookings, assignment dispatch, Dual OTP verification and restricted goods governance
          </p>
        </div>
        <button
          onClick={fetchData}
          style={{
            padding: '8px 16px',
            backgroundColor: '#F1F5F9',
            border: '1px solid #CBD5E1',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '13px',
            color: '#334155',
          }}
        >
          🔄 Refresh
        </button>
      </div>

      <ParcelStatsCards stats={stats} totalCount={totalCount} />

      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #E2E8F0', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('parcels')}
          style={{
            padding: '10px 18px',
            border: 'none',
            borderBottom: activeTab === 'parcels' ? '3px solid #7C3AED' : '3px solid transparent',
            backgroundColor: 'transparent',
            fontWeight: activeTab === 'parcels' ? '700' : '500',
            color: activeTab === 'parcels' ? '#7C3AED' : '#64748B',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          📦 All Parcel Bookings ({totalCount})
        </button>
        <button
          onClick={() => setActiveTab('restrictions')}
          style={{
            padding: '10px 18px',
            border: 'none',
            borderBottom: activeTab === 'restrictions' ? '3px solid #7C3AED' : '3px solid transparent',
            backgroundColor: 'transparent',
            fontWeight: activeTab === 'restrictions' ? '700' : '500',
            color: activeTab === 'restrictions' ? '#7C3AED' : '#64748B',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          🚫 Package Restrictions & Policies ({restrictions.length})
        </button>
        <button
          onClick={() => setActiveTab('services')}
          style={{
            padding: '10px 18px',
            border: 'none',
            borderBottom: activeTab === 'services' ? '3px solid #7C3AED' : '3px solid transparent',
            backgroundColor: 'transparent',
            fontWeight: activeTab === 'services' ? '700' : '500',
            color: activeTab === 'services' ? '#7C3AED' : '#64748B',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          ⚡ Service Tiers & Multipliers ({services.length})
        </button>
      </div>

      {error && (
        <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
          ⚠️ {error}
        </div>
      )}

      {activeTab === 'parcels' && (
        <ParcelsTable
          parcels={parcels}
          isLoading={isLoading}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          serviceTypeFilter={serviceTypeFilter}
          setServiceTypeFilter={setServiceTypeFilter}
          onSearchSubmit={handleSearchSubmit}
        />
      )}

      {activeTab === 'restrictions' && (
        <ParcelRestrictionsTable restrictions={restrictions} />
      )}

      {activeTab === 'services' && (
        <ParcelServicesTable services={services} />
      )}
    </div>
  );
}
