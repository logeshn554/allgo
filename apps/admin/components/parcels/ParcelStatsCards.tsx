import { Card, CardContent } from '@allgo/ui';
import type React from 'react';

interface ParcelStatsCardsProps {
  stats: any;
  totalCount: number;
}

export const ParcelStatsCards: React.FC<ParcelStatsCardsProps> = ({ stats, totalCount }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card size="sm">
        <CardContent>
          <div className="text-xs font-semibold text-muted-foreground uppercase">
            TOTAL BOOKINGS
          </div>
          <div className="text-2xl font-bold text-foreground mt-1.5">
            {stats?.total ?? totalCount}
          </div>
          <div className="text-xs text-primary mt-1">Across all service tiers</div>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardContent>
          <div className="text-xs font-semibold text-muted-foreground uppercase">
            IN DISPATCH / TRANSIT
          </div>
          <div className="text-2xl font-bold text-foreground mt-1.5">{stats?.inTransit ?? 0}</div>
          <div className="text-xs text-muted-foreground mt-1">Active couriers on road</div>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardContent>
          <div className="text-xs font-semibold text-muted-foreground uppercase">
            COMPLETED / DELIVERED
          </div>
          <div className="text-2xl font-bold text-primary mt-1.5">{stats?.delivered ?? 0}</div>
          <div className="text-xs text-primary mt-1">Dual OTP verified</div>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardContent>
          <div className="text-xs font-semibold text-muted-foreground uppercase">
            EXCEPTIONS & RETURNS
          </div>
          <div className="text-2xl font-bold text-destructive mt-1.5">
            {stats?.failedOrReturned ?? 0}
          </div>
          <div className="text-xs text-destructive mt-1">Return to sender / disputed</div>
        </CardContent>
      </Card>
    </div>
  );
};
