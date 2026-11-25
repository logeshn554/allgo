'use client';
import { Card, CardContent } from '@allgo/ui';

interface MobilityStatsProps {
  stats: {
    totalRides: number;
    activeRides: number;
    completedRides: number;
    totalParcels: number;
    totalHireDriverBookings: number;
    openSosAlerts: number;
  };
}

export function MobilityStats({ stats }: MobilityStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      <Card size="sm">
        <CardContent>
          <div className="text-xs font-semibold uppercase text-muted-foreground">ACTIVE RIDES</div>
          <div className="text-2xl font-bold text-foreground mt-1.5">{stats.activeRides}</div>
          <div className="text-xs text-muted-foreground mt-1">{stats.totalRides} Total Booked</div>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardContent>
          <div className="text-xs font-semibold uppercase text-muted-foreground">
            COMPLETED TRIPS
          </div>
          <div className="text-2xl font-bold text-primary mt-1.5">{stats.completedRides}</div>
          <div className="text-xs text-muted-foreground mt-1">Fulfilled Mobility Trips</div>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardContent>
          <div className="text-xs font-semibold uppercase text-muted-foreground">CITY PARCELS</div>
          <div className="text-2xl font-bold text-foreground mt-1.5">{stats.totalParcels}</div>
          <div className="text-xs text-muted-foreground mt-1">Dual-OTP Courier Parcels</div>
        </CardContent>
      </Card>

      <Card size="sm">
        <CardContent>
          <div className="text-xs font-semibold uppercase text-muted-foreground">
            HIRE-DRIVER SESSIONS
          </div>
          <div className="text-2xl font-bold text-foreground mt-1.5">
            {stats.totalHireDriverBookings}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Designated Driver Duties</div>
        </CardContent>
      </Card>

      <Card
        size="sm"
        className={stats.openSosAlerts > 0 ? 'ring-destructive/40 bg-destructive/10' : ''}
      >
        <CardContent>
          <div
            className={`text-xs font-bold uppercase ${stats.openSosAlerts > 0 ? 'text-destructive' : 'text-muted-foreground'}`}
          >
            EMERGENCY SOS ALERTS
          </div>
          <div
            className={`text-2xl font-bold mt-1.5 ${stats.openSosAlerts > 0 ? 'text-destructive' : 'text-foreground'}`}
          >
            {stats.openSosAlerts}
          </div>
          <div
            className={`text-xs mt-1 ${stats.openSosAlerts > 0 ? 'text-destructive font-medium' : 'text-muted-foreground'}`}
          >
            {stats.openSosAlerts > 0 ? 'URGENT DISPATCH ACTION REQ' : 'All clear - No active SOS'}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
