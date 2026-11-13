'use client';

import React, { useState, useEffect } from 'react';
import { adminApi } from '../../../lib/api-client';
import { DispatchStatsCards } from '../../../components/dispatch/DispatchStatsCards';
import { DispatchJobsTable } from '../../../components/dispatch/DispatchJobsTable';
import { DispatchPartnersTable } from '../../../components/dispatch/DispatchPartnersTable';
import { DispatchExceptionsTable } from '../../../components/dispatch/DispatchExceptionsTable';
import {
  ManualAssignModal,
  CancelJobModal,
  JobDetailsModal,
} from '../../../components/dispatch/DispatchModals';

export default function DispatchOperationsPage() {
  const [activeTab, setActiveTab] = useState<'jobs' | 'partners' | 'exceptions'>('jobs');
  const [stats, setStats] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [totalJobs, setTotalJobs] = useState<number>(0);
  const [onlinePartners, setOnlinePartners] = useState<any[]>([]);
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [assignJobId, setAssignJobId] = useState<string | null>(null);
  const [assignPartnerId, setAssignPartnerId] = useState<string>('');
  const [assignReason, setAssignReason] = useState<string>('');
  const [cancelJobId, setCancelJobId] = useState<string | null>(null);
  const [cancelReasonCode, setCancelReasonCode] = useState<string>('ADMIN_OVERRIDE');
  const [cancelReasonDetails, setCancelReasonDetails] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsData, jobsData, partnersData, exData] = await Promise.all([
        adminApi.getDispatchStats(),
        adminApi.listDispatchJobs({ status: statusFilter || undefined, limit: 50 }),
        adminApi.listOnlinePartners(),
        adminApi.listDispatchExceptions(),
      ]);

      setStats(statsData);
      setJobs(jobsData.items || []);
      setTotalJobs(jobsData.total || 0);
      setOnlinePartners(partnersData || []);
      setExceptions(exData || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load dispatch operations data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [statusFilter]);

  const viewJobDetails = async (jobId: string) => {
    try {
      const job = await adminApi.getDispatchJob(jobId);
      setSelectedJob(job);
    } catch (err: any) {
      alert(`Error fetching job: ${err.message}`);
    }
  };

  const handleManualAssign = async () => {
    if (!assignJobId || !assignPartnerId) return;
    try {
      setActionLoading(true);
      await adminApi.manualAssignJob(assignJobId, assignPartnerId, assignReason);
      setAssignJobId(null);
      setAssignPartnerId('');
      setAssignReason('');
      await fetchDashboardData();
    } catch (err: any) {
      alert(`Manual assignment failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelJob = async () => {
    if (!cancelJobId) return;
    try {
      setActionLoading(true);
      await adminApi.cancelDispatchJob(cancelJobId, cancelReasonCode, cancelReasonDetails);
      setCancelJobId(null);
      setCancelReasonDetails('');
      await fetchDashboardData();
    } catch (err: any) {
      alert(`Cancellation failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTriggerDispatch = async (jobId: string) => {
    try {
      await adminApi.triggerDispatch(jobId);
      alert('Dispatch search triggered successfully');
      await fetchDashboardData();
    } catch (err: any) {
      alert(`Dispatch failed: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: '24px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 4px 0' }}>Dispatch Operations Console</h1>
          <p style={{ color: '#64748B', margin: 0, fontSize: '14px' }}>
            Real-time delivery assignments, partner availability telemetry, and fleet operations.
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          disabled={loading}
          style={{
            padding: '8px 16px',
            backgroundColor: '#0F172A',
            color: '#FFFFFF',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          {loading ? 'Refreshing...' : '🔄 Refresh Live State'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: '#FEE2E2', color: '#B91C1C', borderRadius: '8px', marginBottom: '20px' }}>
          {error}
        </div>
      )}

      <DispatchStatsCards stats={stats} />

      <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', marginBottom: '20px', gap: '8px' }}>
        <button
          onClick={() => setActiveTab('jobs')}
          style={{
            padding: '10px 18px',
            border: 'none',
            borderBottom: activeTab === 'jobs' ? '2px solid #2563EB' : 'none',
            backgroundColor: 'transparent',
            fontWeight: activeTab === 'jobs' ? 'bold' : 'normal',
            color: activeTab === 'jobs' ? '#2563EB' : '#64748B',
            cursor: 'pointer',
          }}
        >
          Delivery Jobs ({totalJobs})
        </button>
        <button
          onClick={() => setActiveTab('partners')}
          style={{
            padding: '10px 18px',
            border: 'none',
            borderBottom: activeTab === 'partners' ? '2px solid #2563EB' : 'none',
            backgroundColor: 'transparent',
            fontWeight: activeTab === 'partners' ? 'bold' : 'normal',
            color: activeTab === 'partners' ? '#2563EB' : '#64748B',
            cursor: 'pointer',
          }}
        >
          Online Fleet ({onlinePartners.length})
        </button>
        <button
          onClick={() => setActiveTab('exceptions')}
          style={{
            padding: '10px 18px',
            border: 'none',
            borderBottom: activeTab === 'exceptions' ? '2px solid #2563EB' : 'none',
            backgroundColor: 'transparent',
            fontWeight: activeTab === 'exceptions' ? 'bold' : 'normal',
            color: activeTab === 'exceptions' ? '#2563EB' : '#64748B',
            cursor: 'pointer',
          }}
        >
          Exceptions Queue ({exceptions.length})
        </button>
      </div>

      {activeTab === 'jobs' && (
        <DispatchJobsTable
          jobs={jobs}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          onlinePartners={onlinePartners}
          onViewDetails={viewJobDetails}
          onOpenAssign={(jobId, firstPartnerId) => {
            setAssignJobId(jobId);
            if (firstPartnerId) setAssignPartnerId(firstPartnerId);
          }}
          onTriggerDispatch={handleTriggerDispatch}
          onOpenCancel={(jobId) => setCancelJobId(jobId)}
        />
      )}

      {activeTab === 'partners' && (
        <DispatchPartnersTable onlinePartners={onlinePartners} />
      )}

      {activeTab === 'exceptions' && (
        <DispatchExceptionsTable exceptions={exceptions} />
      )}

      <ManualAssignModal
        assignJobId={assignJobId}
        assignPartnerId={assignPartnerId}
        setAssignPartnerId={setAssignPartnerId}
        assignReason={assignReason}
        setAssignReason={setAssignReason}
        onlinePartners={onlinePartners}
        actionLoading={actionLoading}
        onClose={() => setAssignJobId(null)}
        onConfirm={handleManualAssign}
      />

      <CancelJobModal
        cancelJobId={cancelJobId}
        cancelReasonCode={cancelReasonCode}
        setCancelReasonCode={setCancelReasonCode}
        cancelReasonDetails={cancelReasonDetails}
        setCancelReasonDetails={setCancelReasonDetails}
        actionLoading={actionLoading}
        onClose={() => setCancelJobId(null)}
        onConfirm={handleCancelJob}
      />

      <JobDetailsModal
        selectedJob={selectedJob}
        onClose={() => setSelectedJob(null)}
      />
    </div>
  );
}
