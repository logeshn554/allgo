'use client';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@allgo/ui';
import { Button } from '@allgo/ui';
import { Textarea } from '@allgo/ui';
import { Label } from '@allgo/ui';

interface MobilitySosModalProps {
  selectedSos: any | null;
  resolutionNotes: string;
  setResolutionNotes: (n: string) => void;
  onClose: () => void;
  onResolve: (status: 'RESOLVED' | 'FALSE_ALARM') => Promise<void>;
  isResolving: boolean;
}

export function MobilitySosModal({
  selectedSos,
  resolutionNotes,
  setResolutionNotes,
  onClose,
  onResolve,
  isResolving,
}: MobilitySosModalProps) {
  return (
    <Dialog open={Boolean(selectedSos)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg text-destructive">
            Resolve SOS Emergency Incident
          </DialogTitle>
        </DialogHeader>
        {selectedSos && (
          <p className="text-sm text-muted-foreground">
            Ride #{selectedSos.ride_number} reported by {selectedSos.reporter_name} (
            {selectedSos.reporter_phone})
          </p>
        )}
        <div className="space-y-2 my-2">
          <Label htmlFor="resolution-notes" className="text-xs font-semibold">
            Resolution / Dispatcher Notes:
          </Label>
          <Textarea
            id="resolution-notes"
            value={resolutionNotes}
            onChange={(e) => setResolutionNotes(e.target.value)}
            placeholder="Enter actions taken (police contact, ambulance dispatch, confirmed customer safe)..."
            rows={4}
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" disabled={isResolving} onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            disabled={isResolving}
            onClick={() => onResolve('FALSE_ALARM')}
          >
            Mark False Alarm
          </Button>
          <Button variant="default" disabled={isResolving} onClick={() => onResolve('RESOLVED')}>
            Resolve Incident
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
