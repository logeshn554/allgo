import type { MerchantApplicationSummary } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@allgo/ui';
import { Button } from '@allgo/ui';
import { Input } from '@allgo/ui';
import { Label } from '@allgo/ui';
import type React from 'react';

interface MerchantApprovalActionsProps {
  merchant: MerchantApplicationSummary;
  reviewNotes: string;
  setReviewNotes: (val: string) => void;
  updating: boolean;
  onStatusChange: (status: string) => void;
}

export const MerchantApprovalActions: React.FC<MerchantApprovalActionsProps> = ({
  merchant,
  reviewNotes,
  setReviewNotes,
  updating,
  onStatusChange,
}) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base">Platform Approval & Lifecycle Decisions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Approving this merchant activates their store catalog on customer applications and allows
          them to receive live orders.
        </p>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-muted-foreground">
            Operational Review Audit Notes (Optional)
          </Label>
          <Input
            type="text"
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder="e.g. FSSAI verified against online portal; bank account validated via penny-drop"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => onStatusChange('APPROVED')}
            disabled={updating || merchant.status === 'APPROVED'}
          >
            {updating ? 'Processing...' : 'Approve & Activate Merchant'}
          </Button>

          <Button
            variant="secondary"
            onClick={() => onStatusChange('DOCUMENTS_REQUIRED')}
            disabled={updating}
          >
            Request Additional Documents
          </Button>

          <Button
            variant="destructive"
            onClick={() => onStatusChange('REJECTED')}
            disabled={updating || merchant.status === 'REJECTED'}
          >
            Reject Application
          </Button>

          {merchant.status === 'SUSPENDED' ? (
            <Button onClick={() => onStatusChange('APPROVED')} disabled={updating}>
              {updating ? 'Processing...' : 'Reactivate Suspended Merchant'}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => onStatusChange('SUSPENDED')}
              disabled={updating}
            >
              Suspend Merchant
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
