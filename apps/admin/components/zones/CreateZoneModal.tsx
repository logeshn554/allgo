'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@allgo/ui';
import { Button } from '@allgo/ui';
import { Input } from '@allgo/ui';
import { Textarea } from '@allgo/ui';
import { Label } from '@allgo/ui';

interface CreateZoneModalProps {
  showCreateModal: boolean;
  onClose: () => void;
  newZoneName: string;
  setNewZoneName: (n: string) => void;
  newZoneCode: string;
  setNewZoneCode: (c: string) => void;
  newZonePolygon: string;
  setNewZonePolygon: (p: string) => void;
  isCreatingZone: boolean;
  handleCreateZone: (e: React.FormEvent) => Promise<void>;
}

export function CreateZoneModal({
  showCreateModal,
  onClose,
  newZoneName,
  setNewZoneName,
  newZoneCode,
  setNewZoneCode,
  newZonePolygon,
  setNewZonePolygon,
  isCreatingZone,
  handleCreateZone,
}: CreateZoneModalProps) {
  return (
    <Dialog open={showCreateModal} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">
            Create New Geographic Service Zone
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          Define boundaries using GeoJSON coordinates. PostGIS validity and closing rings are validated automatically.
        </p>

        <form onSubmit={handleCreateZone} className="space-y-4 my-2">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs font-semibold text-foreground">
                Zone Name *
              </Label>
              <Input
                type="text"
                required
                placeholder="e.g. OMR IT Corridor Zone"
                value={newZoneName}
                onChange={(e) => setNewZoneName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground">
                Zone Code *
              </Label>
              <Input
                type="text"
                required
                placeholder="TN_CHE_OMR"
                value={newZoneCode}
                onChange={(e) => setNewZoneCode(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs font-semibold text-foreground">
              Polygon Geometry (GeoJSON coordinates) *
            </Label>
            <Textarea
              value={newZonePolygon}
              onChange={(e) => setNewZonePolygon(e.target.value)}
              rows={6}
              className="font-mono text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isCreatingZone}>
              {isCreatingZone ? 'Validating Geometry...' : 'Create Zone'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
