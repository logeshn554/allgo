import { Card, CardContent } from '@allgo/ui';
import type React from 'react';

interface DispatchStatsCardsProps {
  stats: any;
}

export const DispatchStatsCards: React.FC<DispatchStatsCardsProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      <Card size="sm">
        <CardContent>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            PENDING DISPATCH
          </div>
          <div className="text-2xl font-bold text-foreground mt-2">{stats?.pendingJobs ?? 0}</div>
        </CardContent>
      </Card>
      <Card size="sm">
        <CardContent>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            PARTNER ASSIGNED
          </div>
          <div className="text-2xl font-bold text-foreground mt-2">{stats?.assignedJobs ?? 0}</div>
        </CardContent>
      </Card>
      <Card size="sm">
        <CardContent>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            IN TRANSIT
          </div>
          <div className="text-2xl font-bold text-foreground mt-2">{stats?.inTransitJobs ?? 0}</div>
        </CardContent>
      </Card>
      <Card size="sm">
        <CardContent>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            DELIVERED TODAY
          </div>
          <div className="text-2xl font-bold text-foreground mt-2">
            {stats?.deliveredToday ?? 0}
          </div>
        </CardContent>
      </Card>
      <Card size="sm">
        <CardContent>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            ONLINE FLEET
          </div>
          <div className="text-2xl font-bold text-foreground mt-2">
            {stats?.onlinePartners ?? 0}
          </div>
        </CardContent>
      </Card>
      <Card size="sm">
        <CardContent>
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            OPEN EXCEPTIONS
          </div>
          <div className="text-2xl font-bold text-foreground mt-2">
            {stats?.activeExceptions ?? 0}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
