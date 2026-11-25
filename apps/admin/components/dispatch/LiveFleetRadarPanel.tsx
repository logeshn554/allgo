'use client';

import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@allgo/ui';

interface LiveFleetRadarPanelProps {
  onlinePartners: any[];
  jobs: any[];
}

export function LiveFleetRadarPanel({ onlinePartners, jobs }: LiveFleetRadarPanelProps) {
  const activeJobs = jobs.filter(
    (j) => !['DELIVERED', 'COMPLETED', 'CANCELLED'].includes(String(j.status || '').toUpperCase()),
  );

  // Project lat/lng points onto a 400x220 radar canvas around Chennai center (13.0827, 80.2707)
  const projectPoint = (lat?: number, lng?: number, fallbackIdx = 0) => {
    const validLat = typeof lat === 'number' && lat !== 0 ? lat : 13.06 + (fallbackIdx % 5) * 0.012;
    const validLng =
      typeof lng === 'number' && lng !== 0 ? lng : 80.23 + ((fallbackIdx * 3) % 7) * 0.014;
    const x = Math.min(380, Math.max(20, ((validLng - 80.18) / 0.16) * 360 + 20));
    const y = Math.min(200, Math.max(20, 200 - ((validLat - 12.98) / 0.16) * 180));
    return { x, y, lat: validLat, lng: validLng };
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">Live Fleet & Active Dispatch Radar</CardTitle>
            <CardDescription>
              Real-time spatial distribution of online couriers/drivers and active delivery jobs
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="default">Partners Online: {onlinePartners.length}</Badge>
            <Badge variant="secondary">Active Jobs: {activeJobs.length}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-hidden rounded-xl border border-border bg-muted/30">
          <svg viewBox="0 0 400 220" className="h-64 w-full">
            {[50, 100, 150, 200, 250, 300, 350].map((x) => (
              <line
                key={`vx-${x}`}
                x1={x}
                y1={0}
                x2={x}
                y2={220}
                stroke="currentColor"
                strokeOpacity={0.08}
              />
            ))}
            {[40, 80, 120, 160, 200].map((y) => (
              <line
                key={`hy-${y}`}
                x1={0}
                y1={y}
                x2={400}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.08}
              />
            ))}
            <circle
              cx={200}
              cy={110}
              r={85}
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.12}
              strokeDasharray="4 4"
            />
            <circle
              cx={200}
              cy={110}
              r={45}
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.15}
              strokeDasharray="4 4"
            />

            {onlinePartners.map((p, idx) => {
              const pt = projectPoint(p.latitude, p.longitude, idx);
              return (
                <g key={p.partnerId || p.id || idx}>
                  <circle cx={pt.x} cy={pt.y} r={5} fill="#16a34a" />
                  <title>{`${p.fullName || p.name || 'Partner'} (${pt.lat.toFixed(4)}, ${pt.lng.toFixed(4)})`}</title>
                </g>
              );
            })}

            {activeJobs.map((j, idx) => {
              const pt = projectPoint(j.pickupLat, j.pickupLng, idx + 2);
              return (
                <g key={j.id || idx}>
                  <rect x={pt.x - 4} y={pt.y - 4} width={8} height={8} rx={2} fill="#ea580c" />
                  <title>{`Job #${j.jobNumber || j.id} — ${j.status}`}</title>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-full bg-green-600" /> Online Delivery /
            Ride Partner
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-sm bg-orange-600" /> Active Dispatch Job
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
