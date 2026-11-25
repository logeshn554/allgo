'use client';

import { TicketDetailPane } from '@/components/support/TicketDetailPane';
import { adminApi } from '@/lib/api-client';
import { Button } from '@allgo/ui';
import { Badge } from '@allgo/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@allgo/ui';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@allgo/ui';
import { AlertCircleIcon, CheckmarkCircle01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type React from 'react';
import { useEffect, useState } from 'react';

const SUPPORT_STATUS_ITEMS = {
  ALL: 'All Statuses',
  OPEN: 'OPEN',
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  WAITING_FOR_CUSTOMER: 'WAITING_FOR_CUSTOMER',
  ESCALATED: 'ESCALATED',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
};

export default function SupportAdminPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('');

  // Selected Ticket State
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [selectedTicketLoading, setSelectedTicketLoading] = useState(false);

  // Note/Message Draft
  const [messageDraft, setMessageDraft] = useState('');
  const [isInternalDraft, setIsInternalDraft] = useState(false);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.listSupportTickets(filterStatus || undefined);
      setTickets(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [filterStatus]);

  const handleSelectTicket = async (id: string) => {
    try {
      setSelectedTicketLoading(true);
      const details = await adminApi.getSupportTicketDetails(id);
      setSelectedTicket(details);
    } catch (err: any) {
      setError(err.message || 'Failed to load ticket details');
    } finally {
      setSelectedTicketLoading(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!selectedTicket) return;
    try {
      await adminApi.updateSupportTicket(selectedTicket.id, { status });
      setActionSuccess(`Ticket status updated to ${status}`);
      await handleSelectTicket(selectedTicket.id);
      fetchTickets();
    } catch (err: any) {
      setError(err.message || 'Failed to update ticket status');
    }
  };

  const handleAddMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !messageDraft.trim()) return;
    try {
      await adminApi.addSupportMessage(selectedTicket.id, {
        message: messageDraft,
        isInternal: isInternalDraft,
      });
      setMessageDraft('');
      await handleSelectTicket(selectedTicket.id);
    } catch (err: any) {
      setError(err.message || 'Failed to add message');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Customer & Merchant Support Operations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Resolve complaints, assign escalations, process goodwill refunds, and audit
            communication logs.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={fetchTickets}>Refresh Queue</Button>
          <Select
            value={filterStatus || 'ALL'}
            items={SUPPORT_STATUS_ITEMS}
            onValueChange={(val) => setFilterStatus(val === 'ALL' ? '' : (val ?? ''))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="OPEN">OPEN</SelectItem>
                <SelectItem value="ASSIGNED">ASSIGNED</SelectItem>
                <SelectItem value="IN_PROGRESS">IN_PROGRESS</SelectItem>
                <SelectItem value="WAITING_FOR_CUSTOMER">WAITING_FOR_CUSTOMER</SelectItem>
                <SelectItem value="ESCALATED">ESCALATED</SelectItem>
                <SelectItem value="RESOLVED">RESOLVED</SelectItem>
                <SelectItem value="CLOSED">CLOSED</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-lg bg-primary/10 text-primary border border-primary/20 text-sm flex items-center gap-2">
          <HugeiconsIcon icon={CheckmarkCircle01Icon} strokeWidth={2} className="size-4" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 text-sm flex items-center gap-2">
          <HugeiconsIcon icon={AlertCircleIcon} strokeWidth={2} className="size-4" />
          <span>{error}</span>
        </div>
      )}

      <div
        className={`grid ${selectedTicket ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'} gap-6`}
      >
        {/* TICKET QUEUE */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ticket Queue ({tickets.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading tickets...</p>
            ) : tickets.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No tickets found matching the selected filter.
              </p>
            ) : (
              <div className="space-y-3">
                {tickets.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => handleSelectTicket(t.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedTicket?.id === t.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-card hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-sm text-foreground">{t.subject}</span>
                      <Badge
                        variant={
                          t.status === 'RESOLVED'
                            ? 'default'
                            : t.status === 'ESCALATED'
                              ? 'destructive'
                              : 'secondary'
                        }
                      >
                        {t.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mb-1">
                      Category: <b>{t.category}</b> | Priority: <b>{t.priority}</b> | Role:{' '}
                      <b>{t.creator_role}</b>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Created: {new Date(t.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* TICKET DETAILS PANE */}
        {selectedTicket && (
          <TicketDetailPane
            selectedTicket={selectedTicket}
            selectedTicketLoading={selectedTicketLoading}
            handleUpdateStatus={handleUpdateStatus}
            messageDraft={messageDraft}
            setMessageDraft={setMessageDraft}
            isInternalDraft={isInternalDraft}
            setIsInternalDraft={setIsInternalDraft}
            handleAddMessage={handleAddMessage}
          />
        )}
      </div>
    </div>
  );
}
