import React from 'react';
import { MerchantApplicationSummary } from '@/lib/api-client';
import { Card, CardHeader, CardTitle, CardContent } from '@allgo/ui';
import { Badge } from '@allgo/ui';
import { Button } from '@allgo/ui';

interface MerchantOutletsListProps {
  merchant: MerchantApplicationSummary;
  outletUpdating: string | null;
  onUpdateStatus: (outletId: string, status: string) => void;
}

export const MerchantOutletsList: React.FC<MerchantOutletsListProps> = ({
  merchant,
  outletUpdating,
  onUpdateStatus,
}) => {
  const outlets = (merchant as any).outlets || [];

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-base">Registered Outlets & Branch Compliance</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Each branch outlet undergoes independent inspection and authorization. Primary activation does not auto-activate secondary branches.
            </p>
          </div>
          <Badge variant="secondary">
            {outlets.length > 0 ? outlets.length : (merchant.outlet_name ? 1 : 0)} Outlets
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {outlets.length > 0 ? (
          <div className="space-y-3">
            {outlets.map((outlet: any) => {
              const status = outlet.outlet_status || 'PENDING_APPROVAL';
              const isUpdating = outletUpdating === outlet.id;

              return (
                <div
                  key={outlet.id}
                  className="flex justify-between items-center p-3 rounded-lg border border-border bg-muted/40"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-foreground">{outlet.outlet_name}</span>
                      <Badge
                        variant={
                          status === 'ACTIVE'
                            ? 'default'
                            : status === 'SUSPENDED'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {status}
                      </Badge>
                      <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                        <span className={`size-1.5 rounded-full ${outlet.is_open ? 'bg-primary' : 'bg-muted-foreground'}`} />
                        {outlet.is_open ? 'Duty: Open' : 'Duty: Closed'}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {outlet.address_line1}, PIN: {outlet.postal_code}
                    </div>
                  </div>

                  <div>
                    {status !== 'ACTIVE' ? (
                      <Button
                        size="sm"
                        onClick={() => onUpdateStatus(outlet.id, 'ACTIVE')}
                        disabled={isUpdating}
                      >
                        {isUpdating ? 'Updating...' : 'Approve Branch'}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onUpdateStatus(outlet.id, 'SUSPENDED')}
                        disabled={isUpdating}
                      >
                        {isUpdating ? 'Updating...' : 'Suspend Branch'}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-muted text-muted-foreground text-sm">
            Primary Outlet: {merchant.outlet_name || 'Main Store'} ({merchant.address_line1 || 'Registered Address'})
          </div>
        )}
      </CardContent>
    </Card>
  );
};
