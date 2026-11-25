'use client';

import { DispatchExceptionsTable } from '@/components/dispatch/DispatchExceptionsTable';
import { DispatchJobsTable } from '@/components/dispatch/DispatchJobsTable';
import { DispatchModals } from '@/components/dispatch/DispatchModals';
import { DispatchPartnersTable } from '@/components/dispatch/DispatchPartnersTable';
import { DispatchStatsCards } from '@/components/dispatch/DispatchStatsCards';
import { type DispatchJob, adminApi } from '@/lib/api-client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@allgo/ui';
import { Button } from '@allgo/ui';
import { RefreshIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useEffect, useState } from 'react';

export default function DispatchPage() {
  const [stats, setStats] = useState<any>(null);
  const [jobs, setJobs] = useState<DispatchJob[]>([]);
  const [totalJobs, setTotalJobs] = useState<number>(0);
  const [onlinePartners, setOnlinePartners] = useState<any[]>([]);
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'jobs' | 'partners' | 'exceptions'>('jobs');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [assignJobId, setAssignJobId] = useState<string | null>(null);
  const [assignPartnerId, setAssignPartnerId] = useState<string>('');
  const [assignReason, setAssignReason] = useState<string>('');
  const [cancelJobId, setCancelJobId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [resolvingExId, setResolvingExId] = useState<string | null>(null);
  const [resolveAction, setResolveAction] = useState<string>('RETRY');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [statsData, jobsData, partnersData, exceptionsData] = await Promise.all([
        adminApi.getDispatchStats(),
        adminApi.listDispatchJobs({ status: statusFilter === 'ALL' ? undefined : statusFilter }),
        adminApi.getOnlinePartners(),
        adminApi.getDispatchExceptions(),
      ]);
      setStats(statsData);
      setJobs((jobsData as any).jobs || (Array.isArray(jobsData) ? jobsData : []));
      setTotalJobs((jobsData as any).total || (Array.isArray(jobsData) ? jobsData.length : 0));
      setOnlinePartners(partnersData || []);
      setExceptions(exceptionsData || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dispatch telemetry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 15000);
    return () => clearInterval(interval);
  }, [statusFilter]);

  const viewJobDetails = async (jobId: string) => {
    try {
      const details = await adminApi.getDispatchJobDetails(jobId);
      setSelectedJob(details);
    } catch (err: any) {
      alert(err.message || 'Failed to fetch details');
    }
  };

  const handleManualAssign = async () => {
    if (!assignJobId || !assignPartnerId) return;
    try {
      setActionLoading(true);
      await adminApi.manualAssignDispatchJob(
        assignJobId,
        assignPartnerId,
        assignReason || undefined,
      );
      setAssignJobId(null);
      setAssignPartnerId('');
      setAssignReason('');
      await fetchDashboardData();
    } catch (err: any) {
      alert(err.message || 'Assignment failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTriggerDispatch = async (jobId: string) => {
    try {
      await adminApi.triggerDispatchJob(jobId);
      await fetchDashboardData();
    } catch (err: any) {
      alert(err.message || 'Trigger dispatch failed');
    }
  };

  const handleCancelJob = async () => {
    if (!cancelJobId || !cancelReason) {
      alert('Cancellation reason required');
      return;
    }
    try {
      setActionLoading(true);
      await adminApi.cancelDispatchJob(cancelJobId, cancelReason);
      setCancelJobId(null);
      setCancelReason('');
      await fetchDashboardData();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel job');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveException = async () => {
    if (!resolvingExId) return;
    try {
      setActionLoading(true);
      await adminApi.resolveDispatchException(resolvingExId, resolveAction);
      setResolvingExId(null);
      await fetchDashboardData();
    } catch (err: any) {
      alert(err.message || 'Failed to resolve exception');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Dispatch Operations Console
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time delivery assignments, partner availability telemetry, and fleet operations.
          </p>
        </div>
        <Button
          onClick={fetchDashboardData}
          disabled={loading}
          variant="outline"
          size="sm"
          className="gap-2 cursor-pointer self-start sm:self-auto"
        >
          <HugeiconsIcon
            icon={RefreshIcon}
            strokeWidth={2}
            className={`size-4 ${loading ? 'animate-spin' : ''}`}
          />
          <span>{loading ? 'Refreshing...' : 'Refresh Live State'}</span>
        </Button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          {error}
        </div>
      )}

      <DispatchStatsCards stats={stats} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <TabsList variant="line">
          <TabsTrigger value="jobs">Delivery Jobs ({totalJobs})</TabsTrigger>
          <TabsTrigger value="partners">Online Fleet ({onlinePartners.length})</TabsTrigger>
          <TabsTrigger value="exceptions">Exceptions Queue ({exceptions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs">
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
        </TabsContent>

        <TabsContent value="partners">
          <DispatchPartnersTable onlinePartners={onlinePartners} />
        </TabsContent>

        <TabsContent value="exceptions">
          <DispatchExceptionsTable
            exceptions={exceptions}
            onOpenResolve={(exId) => setResolvingExId(exId)}
          />
        </TabsContent>
      </Tabs>

      <DispatchModals
        selectedJob={selectedJob}
        onCloseDetails={() => setSelectedJob(null)}
        assignJobId={assignJobId}
        onCloseAssign={() => setAssignJobId(null)}
        assignPartnerId={assignPartnerId}
        setAssignPartnerId={setAssignPartnerId}
        assignReason={assignReason}
        setAssignReason={setAssignReason}
        onConfirmAssign={handleManualAssign}
        cancelJobId={cancelJobId}
        onCloseCancel={() => setCancelJobId(null)}
        cancelReason={cancelReason}
        setCancelReason={setCancelReason}
        onConfirmCancel={handleCancelJob}
        resolvingExId={resolvingExId}
        onCloseResolve={() => setResolvingExId(null)}
        resolveAction={resolveAction}
        setResolveAction={setResolveAction}
        onConfirmResolve={handleResolveException}
        actionLoading={actionLoading}
        onlinePartners={onlinePartners}
      />
    </div>
  );
}
