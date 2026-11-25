'use client';
import { Card, CardContent } from '@allgo/ui';

interface ZonesMetricsProps {
  totalZones: number;
  activeZones: number;
  surgeActiveCount: number;
}

export function ZonesMetrics({ totalZones, activeZones, surgeActiveCount }: ZonesMetricsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card size="sm">
        <CardContent>
          <div className="text-xs font-medium text-muted-foreground uppercase">
            TOTAL REGISTERED ZONES
          </div>
          <div className="text-2xl font-bold text-foreground mt-1.5">{totalZones}</div>
          <div className="text-xs text-primary mt-1">Chennai Pilot Hub</div>
        </CardContent>
      </Card>
      <Card size="sm">
        <CardContent>
          <div className="text-xs font-medium text-muted-foreground uppercase">
            ACTIVE SERVICE ZONES
          </div>
          <div className="text-2xl font-bold text-primary mt-1.5">{activeZones}</div>
          <div className="text-xs text-muted-foreground mt-1">100% PostGIS polygon verified</div>
        </CardContent>
      </Card>
      <Card size="sm">
        <CardContent>
          <div className="text-xs font-medium text-muted-foreground uppercase">
            ACTIVE SURGE ZONES
          </div>
          <div
            className={`text-2xl font-bold mt-1.5 ${surgeActiveCount > 0 ? 'text-destructive' : 'text-foreground'}`}
          >
            {surgeActiveCount}
          </div>
          <div className="text-xs text-muted-foreground mt-1">Dynamic multiplier active</div>
        </CardContent>
      </Card>
      <Card size="sm">
        <CardContent>
          <div className="text-xs font-medium text-muted-foreground uppercase">
            STANDARD BASE FEE
          </div>
          <div className="text-2xl font-bold text-foreground mt-1.5">₹30 - ₹40</div>
          <div className="text-xs text-muted-foreground mt-1">Free up to 3 km</div>
        </CardContent>
      </Card>
    </div>
  );
}
