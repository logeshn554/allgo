'use client';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@allgo/ui';
import { Button } from '@allgo/ui';
import { Textarea } from '@allgo/ui';
import { Switch } from '@allgo/ui';
import { Label } from '@allgo/ui';
import { Input } from '@allgo/ui';

interface ZoneSurgeModalProps {
  selectedZoneForSurge: any | null;
  isSurgeActive: boolean;
  setIsSurgeActive: (a: boolean) => void;
  surgeMultiplier: number;
  setSurgeMultiplier: (m: number) => void;
  surgeReason: string;
  setSurgeReason: (r: string) => void;
  onClose: () => void;
  onSaveSurge: () => Promise<void>;
  isSavingSurge: boolean;
}

export function ZoneSurgeModal({
  selectedZoneForSurge,
  isSurgeActive,
  setIsSurgeActive,
  surgeMultiplier,
  setSurgeMultiplier,
  surgeReason,
  setSurgeReason,
  onClose,
  onSaveSurge,
  isSavingSurge,
}: ZoneSurgeModalProps) {
  return (
    <Dialog open={Boolean(selectedZoneForSurge)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">
            Dynamic Surge Pricing: {selectedZoneForSurge?.name}
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Modifying surge multipliers directly updates checkout fees and records an immutable audit
          log.
        </p>

        <div className="space-y-4 my-2 text-sm">
          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/40">
            <div className="space-y-0.5">
              <Label htmlFor="surge-active" className="text-sm font-semibold">
                Surge Active Status
              </Label>
              <p className="text-xs text-muted-foreground">
                {isSurgeActive
                  ? 'Surge pricing is dynamically applied'
                  : 'Standard pricing (surge inactive)'}
              </p>
            </div>
            <Switch id="surge-active" checked={isSurgeActive} onCheckedChange={setIsSurgeActive} />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="surge-mult" className="text-xs font-semibold text-foreground">
                Surge Multiplier (1.00x – 3.00x)
              </Label>
              <span className="font-bold text-sm text-primary">{surgeMultiplier.toFixed(1)}x</span>
            </div>
            <Input
              id="surge-mult"
              type="number"
              min="1.0"
              max="3.0"
              step="0.1"
              value={surgeMultiplier}
              onChange={(e) => setSurgeMultiplier(Number.parseFloat(e.target.value) || 1.0)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="surge-reason" className="text-xs font-semibold text-foreground">
              Mandatory Operational Reason *
            </Label>
            <Textarea
              id="surge-reason"
              value={surgeReason}
              onChange={(e) => setSurgeReason(e.target.value)}
              placeholder="e.g., Heavy Monsoon Rains, High Dispatch Pressure in Anna Nagar"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={onSaveSurge} disabled={isSavingSurge}>
            {isSavingSurge ? 'Saving...' : 'Apply Surge'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
