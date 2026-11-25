import React from 'react';
import { StatusBadge } from '@allgo/ui';
import { Button } from '@allgo/ui';
import { Card, CardHeader, CardTitle, CardContent } from '@allgo/ui';

interface PartnerServicesApprovalProps {
  services: any[];
  submitting: boolean;
  onServiceStatus: (serviceType: string, newStatus: string) => void;
}

export const PartnerServicesApproval: React.FC<PartnerServicesApprovalProps> = ({
  services,
  submitting,
  onServiceStatus,
}) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base">Independent Service Category Applications</CardTitle>
        <p className="text-xs text-muted-foreground">
          RULE: Each service application must be approved independently. Food delivery approval does not authorize bike taxi or cab rides.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {services.map((s: any) => (
          <div
            key={s.service_type}
            className="flex justify-between items-center p-3 rounded-lg border border-border bg-muted/40"
          >
            <div>
              <div className="font-semibold text-sm">{s.service_type.replace('_', ' ')}</div>
              <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                <span>Current Status:</span>
                <StatusBadge status={s.status} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={submitting || s.status === 'APPROVED'}
                onClick={() => onServiceStatus(s.service_type, 'APPROVED')}
              >
                Approve Service
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={submitting || s.status === 'REJECTED'}
                onClick={() => onServiceStatus(s.service_type, 'REJECTED')}
              >
                Reject
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
