'use client';

import React, { useState } from 'react';
import { Button } from '@allgo/ui';
import { Textarea } from '@allgo/ui';
import { Checkbox } from '@allgo/ui';
import { Label } from '@allgo/ui';
import { Badge } from '@allgo/ui';
import { Card, CardHeader, CardTitle, CardContent } from '@allgo/ui';
import { HugeiconsIcon } from '@hugeicons/react';
import { Cancel01Icon } from '@hugeicons/core-free-icons';

interface TicketDetailPaneProps {
  selectedTicket: any;
  selectedTicketLoading: boolean;
  handleUpdateStatus: (status: string) => void;
  messageDraft: string;
  setMessageDraft: (val: string) => void;
  isInternalDraft: boolean;
  setIsInternalDraft: (val: boolean) => void;
  handleAddMessage: (e: React.FormEvent) => void;
  onClose?: () => void;
}

export function TicketDetailPane({
  selectedTicket,
  selectedTicketLoading,
  handleUpdateStatus,
  messageDraft,
  setMessageDraft,
  isInternalDraft,
  setIsInternalDraft,
  handleAddMessage,
  onClose,
}: TicketDetailPaneProps) {
  if (selectedTicketLoading) {
    return (
      <Card>
        <CardContent className="py-2 text-center text-sm text-muted-foreground">
          Loading ticket details...
        </CardContent>
      </Card>
    );
  }

  const messages = selectedTicket.messages || [];

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="border-b border-border">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-base">{selectedTicket.subject}</CardTitle>
            <div className="text-xs text-muted-foreground mt-1">
              From: {selectedTicket.creator_name || selectedTicket.creator_phone} ({selectedTicket.creator_role})
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4 flex flex-col justify-between">
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleUpdateStatus('IN_PROGRESS')}
          >
            Set IN_PROGRESS
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleUpdateStatus('ESCALATED')}
          >
            Escalate Dispute
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => handleUpdateStatus('RESOLVED')}
          >
            Mark RESOLVED
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleUpdateStatus('CLOSED')}
          >
            Close Ticket
          </Button>
        </div>

        <div className="flex-1 max-h-80 overflow-y-auto space-y-3 p-1">
          {messages.map((m: any) => (
            <div
              key={m.id}
              className={`p-3 rounded-lg border max-w-[85%] text-xs ${
                m.is_internal
                  ? 'bg-amber-500/10 border-amber-500/30 self-start'
                  : m.sender_role === 'ADMIN'
                  ? 'bg-primary/10 border-primary/20 self-end ms-auto'
                  : 'bg-muted border-border self-start'
              }`}
            >
              <div className="font-semibold mb-1 flex items-center gap-2">
                <span>
                  {m.is_internal ? '[INTERNAL ADMIN NOTE]' : `${m.sender_name || m.sender_role}`}
                </span>
                <span className="text-muted-foreground font-normal">
                  {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div className="text-foreground whitespace-pre-wrap">{m.message}</div>
            </div>
          ))}
        </div>

        <form onSubmit={handleAddMessage} className="border-t border-border pt-3 space-y-3">
          <Textarea
            value={messageDraft}
            onChange={(e) => setMessageDraft(e.target.value)}
            placeholder={isInternalDraft ? 'Add internal note (visible ONLY to admins)...' : 'Write reply to customer/partner...'}
            rows={3}
            required
            className={isInternalDraft ? 'border-amber-500/50' : ''}
          />
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Checkbox
                id="internal-note"
                checked={isInternalDraft}
                onCheckedChange={(checked) => setIsInternalDraft(Boolean(checked))}
              />
              <Label htmlFor="internal-note" className="text-xs font-semibold text-amber-600 dark:text-amber-400 cursor-pointer">
                Mark as Internal Note (Never visible to customer)
              </Label>
            </div>
            <Button
              type="submit"
              variant={isInternalDraft ? 'secondary' : 'default'}
              size="sm"
            >
              {isInternalDraft ? 'Add Note' : 'Send Reply'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
