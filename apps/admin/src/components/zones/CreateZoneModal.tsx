'use client';

import React from 'react';

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
  if (!showCreateModal) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          padding: '24px',
          width: '560px',
          maxWidth: '90%',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
        }}
      >
        <h3 style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 'bold' }}>
          Create New Geographic Service Zone
        </h3>
        <p style={{ color: '#64748B', fontSize: '13px', margin: '0 0 16px' }}>
          Define boundaries using GeoJSON coordinates. PostGIS validity and closing rings are validated automatically.
        </p>

        <form onSubmit={handleCreateZone}>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                Zone Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. OMR IT Corridor Zone"
                value={newZoneName}
                onChange={(e) => setNewZoneName(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ width: '140px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
                Zone Code *
              </label>
              <input
                type="text"
                required
                placeholder="TN_CHE_OMR"
                value={newZoneCode}
                onChange={(e) => setNewZoneCode(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>
              Polygon Geometry (GeoJSON coordinates) *
            </label>
            <textarea
              value={newZonePolygon}
              onChange={(e) => setNewZonePolygon(e.target.value)}
              rows={8}
              style={{
                width: '100%',
                fontFamily: 'monospace',
                fontSize: '12px',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #CBD5E1',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '8px 16px', backgroundColor: '#FFFFFF', border: '1px solid #CBD5E1', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreatingZone}
              style={{ padding: '8px 18px', backgroundColor: '#00C853', color: '#FFFFFF', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              {isCreatingZone ? 'Validating Geometry...' : 'Create Zone'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
