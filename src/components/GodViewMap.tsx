// Job: PostGIS-backed live geospatial map ("God View") visualizing orders, heatmaps, and zones.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ActiveOrderPin, DriverCluster, GeofenceZone } from '../data/adminDispatchService';

interface Props {
  orders: ActiveOrderPin[];
  clusters: DriverCluster[];
  zones: GeofenceZone[];
  selectedOrderId?: string;
  onSelectOrder?: (orderId: string) => void;
}

export const GodViewMap: React.FC<Props> = ({
  orders,
  clusters,
  zones,
  selectedOrderId,
}) => {
  const unassigned = orders.filter((o) => o.status === 'UNASSIGNED');
  const active = orders.filter((o) => o.status !== 'UNASSIGNED');

  return (
    <View style={styles.container}>
      {/* Legend & Stats Banner */}
      <View style={styles.statusBar}>
        <View style={styles.statItem}>
          <Text style={styles.statDotRed}>●</Text>
          <Text style={styles.statText}>Unassigned: {unassigned.length}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statDotGreen}>●</Text>
          <Text style={styles.statText}>Active In-Transit: {active.length}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statDotBlue}>●</Text>
          <Text style={styles.statText}>Driver Clusters: {clusters.length}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statDotPurple}>●</Text>
          <Text style={styles.statText}>Geofence Zones: {zones.length}</Text>
        </View>
      </View>

      {/* Geospatial Canvas Visualizer */}
      <View style={styles.canvas}>
        {/* Render Geofence Zones */}
        {zones.map((zone) => (
          <View key={zone.id} style={styles.zoneBox}>
            <Text style={styles.zoneLabel}>
              🔶 {zone.name} ({zone.surgeMultiplier}x Surge)
            </Text>
          </View>
        ))}

        {/* Driver Clusters */}
        <View style={styles.clusterRow}>
          {clusters.map((c) => (
            <View key={c.clusterId} style={styles.clusterPill}>
              <Text style={styles.clusterText}>
                🚗 {c.zoneName}: {c.driverCount} Drivers ({c.density} Density)
              </Text>
            </View>
          ))}
        </View>

        {/* Active Pins Representation */}
        <View style={styles.pinGrid}>
          {orders.map((ord) => (
            <View
              key={ord.id}
              style={[
                styles.orderBadge,
                ord.status === 'UNASSIGNED' ? styles.orderBadgeUnassigned : styles.orderBadgeActive,
                selectedOrderId === ord.id && styles.orderBadgeSelected,
              ]}
            >
              <Text style={styles.orderBadgeId}>
                {ord.status === 'UNASSIGNED' ? '⚠️ ' : '🛵 '}
                {ord.id} ({ord.customerName})
              </Text>
              <Text style={styles.orderBadgeStatus}>
                {ord.status} • {ord.stalledMinutes}m stalled
              </Text>
            </View>
          ))}
        </View>
      </View>

      <Text style={styles.footerNote}>
        🗺️ PostGIS Live Ingestion: Lat 12.9716, Lon 77.5946 (Bengaluru Metro Core)
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
    marginBottom: 16,
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statDotRed: { color: '#EF4444', fontSize: 16 },
  statDotGreen: { color: '#00C853', fontSize: 16 },
  statDotBlue: { color: '#38BDF8', fontSize: 16 },
  statDotPurple: { color: '#A855F7', fontSize: 16 },
  statText: { color: '#F1F5F9', fontSize: 12, fontWeight: '700' },
  canvas: { padding: 14, backgroundColor: '#0B1120' },
  zoneBox: {
    backgroundColor: 'rgba(234, 88, 12, 0.15)',
    borderColor: '#EA580C',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  zoneLabel: { color: '#FB923C', fontSize: 12, fontWeight: '800' },
  clusterRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 },
  clusterPill: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38BDF8',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clusterText: { color: '#BAE6FD', fontSize: 11, fontWeight: '700' },
  pinGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  orderBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  orderBadgeUnassigned: { backgroundColor: 'rgba(239, 68, 68, 0.2)', borderColor: '#EF4444' },
  orderBadgeActive: { backgroundColor: 'rgba(0, 200, 83, 0.2)', borderColor: '#00C853' },
  orderBadgeSelected: { borderColor: '#FFFFFF', borderWidth: 2 },
  orderBadgeId: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  orderBadgeStatus: { color: '#CBD5E1', fontSize: 10, marginTop: 2 },
  footerNote: {
    backgroundColor: '#1E293B',
    color: '#94A3B8',
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 6,
  },
});
