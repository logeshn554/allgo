// Job: Central dispatch console with God View map, manual overrides, disputes, and surge geofencing.

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { GodViewMap } from '../components/GodViewMap.tsx';
import { DisputeRefundModal } from '../components/DisputeRefundModal.tsx';
import {
  ActiveOrderPin,
  DriverCluster,
  GeofenceZone,
  DisputeAuditRecord,
  calculateSupplyDemandSurge,
} from '../data/adminDispatchService';

interface Props {
  onBack: () => void;
}

const INITIAL_PINS: ActiveOrderPin[] = [
  {
    id: 'ORD-701',
    customerName: 'Meera K',
    status: 'UNASSIGNED',
    pickupLat: 12.9716,
    pickupLon: 77.5946,
    dropoffLat: 12.9800,
    dropoffLon: 77.6050,
    stalledMinutes: 8,
  },
  {
    id: 'ORD-702',
    customerName: 'Ramesh P',
    status: 'IN_TRANSIT',
    pickupLat: 12.9750,
    pickupLon: 77.6000,
    dropoffLat: 12.9850,
    dropoffLon: 77.6100,
    assignedDriverId: 'DRV-4421',
    stalledMinutes: 2,
  },
  {
    id: 'ORD-703',
    customerName: 'Kavitha R',
    status: 'UNASSIGNED',
    pickupLat: 12.9350,
    pickupLon: 77.6240,
    dropoffLat: 12.9450,
    dropoffLon: 77.6350,
    stalledMinutes: 14, // stalled
  },
];

const INITIAL_CLUSTERS: DriverCluster[] = [
  { clusterId: 'c1', zoneName: 'Indiranagar Hub', centerLat: 12.9784, centerLon: 77.6408, driverCount: 18, density: 'HIGH' },
  { clusterId: 'c2', zoneName: 'Koramangala 4th Block', centerLat: 12.9352, centerLon: 77.6245, driverCount: 12, density: 'MEDIUM' },
  { clusterId: 'c3', zoneName: 'Whitefield IT Corridor', centerLat: 12.9698, centerLon: 77.7500, driverCount: 4, density: 'LOW' },
];

const INITIAL_ZONES: GeofenceZone[] = [
  {
    id: 'z1',
    name: 'Bengaluru CBD & MG Road',
    polygon: [[12.970, 77.590], [12.975, 77.600], [12.980, 77.595], [12.970, 77.590]],
    activeSupplyDrivers: 8,
    activeDemandRequests: 16,
    surgeMultiplier: 1.5,
    baseDeliveryFeeCents: 4500,
  },
  {
    id: 'z2',
    name: 'Koramangala Food Corridor',
    polygon: [[12.930, 77.620], [12.940, 77.630], [12.935, 77.625], [12.930, 77.620]],
    activeSupplyDrivers: 6,
    activeDemandRequests: 18,
    surgeMultiplier: 2.0,
    baseDeliveryFeeCents: 5500,
  },
];

export const AdminGodViewPage: React.FC<Props> = ({ onBack }) => {
  const [orders, setOrders] = useState<ActiveOrderPin[]>(INITIAL_PINS);
  const [zones, setZones] = useState<GeofenceZone[]>(INITIAL_ZONES);
  const [selectedDisputeOrderId, setSelectedDisputeOrderId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Manual Dispatch Override Handlers
  const handleManualAssign = (orderId: string) => {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId ? { ...o, status: 'ASSIGNED', assignedDriverId: 'DRV-DISPATCH-OVERRIDE' } : o
      )
    );
    setFeedback(`Manual Override: Order #${orderId} assigned to DRV-DISPATCH-OVERRIDE.`);
  };

  const handleCancelStalled = (orderId: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
    setFeedback(`Manual Override: Stalled delivery #${orderId} cancelled by dispatcher.`);
  };

  const handleSurgeRecalculate = (zoneId: string) => {
    setZones((prev) =>
      prev.map((z) => {
        if (z.id !== zoneId) return z;
        const newSurge = calculateSupplyDemandSurge(z.activeSupplyDrivers, z.activeDemandRequests + 4);
        return { ...z, surgeMultiplier: newSurge, activeDemandRequests: z.activeDemandRequests + 4 };
      })
    );
    setFeedback('Dynamic surge multipliers updated across geofenced polygon zones.');
  };

  return (
    <ScrollView style={styles.screen}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backLink}>← Return Home</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🌐 Admin Operations Center & God View</Text>
      </View>

      {feedback && (
        <View style={styles.feedbackBanner}>
          <Text style={styles.feedbackText}>{feedback}</Text>
        </View>
      )}

      {/* God View Geospatial Map */}
      <GodViewMap orders={orders} clusters={INITIAL_CLUSTERS} zones={zones} />

      {/* Manual Dispatch Override Queue */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>⚠️ Manual Dispatch Override Queue</Text>
        <Text style={styles.cardSub}>Intervene on unassigned or stalled orders to prevent SLA breach</Text>
        {orders.map((ord) => (
          <View key={ord.id} style={styles.orderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.orderTitle}>#{ord.id} - {ord.customerName}</Text>
              <Text style={styles.orderSub}>
                Status: {ord.status} • Stalled: {ord.stalledMinutes}m {ord.assignedDriverId ? `• Assigned: ${ord.assignedDriverId}` : ''}
              </Text>
            </View>
            <View style={styles.actionBtns}>
              {ord.status === 'UNASSIGNED' && (
                <TouchableOpacity style={styles.assignBtn} onPress={() => handleManualAssign(ord.id)}>
                  <Text style={styles.btnText}>Force Assign</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancelStalled(ord.id)}>
                <Text style={styles.btnText}>Cancel Stalled</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.disputeBtn}
                onPress={() => setSelectedDisputeOrderId(ord.id)}
              >
                <Text style={styles.btnText}>Audit Dispute</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      {/* Dynamic Surge & Geofencing Management */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>⚡ Dynamic Surge & Geofencing Zones</Text>
        <Text style={styles.cardSub}>PostGIS polygon boundaries and live supply/demand multiplier calibration</Text>
        {zones.map((z) => (
          <View key={z.id} style={styles.zoneRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.zoneName}>Polygon Zone: {z.name}</Text>
              <Text style={styles.zoneStats}>
                Supply: {z.activeSupplyDrivers} Drivers | Demand: {z.activeDemandRequests} Orders | Multiplier: {z.surgeMultiplier}x
              </Text>
            </View>
            <TouchableOpacity style={styles.recalcBtn} onPress={() => handleSurgeRecalculate(z.id)}>
              <Text style={styles.btnText}>Recalibrate Surge</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Dispute Audit Modal */}
      {selectedDisputeOrderId && (
        <DisputeRefundModal
          visible={Boolean(selectedDisputeOrderId)}
          orderId={selectedDisputeOrderId}
          onClose={() => setSelectedDisputeOrderId(null)}
          onResolved={(rec: DisputeAuditRecord) => {
            setSelectedDisputeOrderId(null);
            setFeedback(`Dispute resolved! ₹${(rec.refundIssuedCents / 100).toFixed(0)} pro-rated refund issued to customer.`);
          }}
        />
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0F172A', padding: 16 },
  topBar: { marginBottom: 14 },
  backLink: { color: '#38BDF8', fontWeight: '800', fontSize: 13, marginBottom: 4 },
  title: { fontSize: 20, fontWeight: '900', color: '#F8FAFC' },
  feedbackBanner: { backgroundColor: '#1E293B', borderColor: '#38BDF8', borderWidth: 1, padding: 10, borderRadius: 8, marginBottom: 12 },
  feedbackText: { color: '#BAE6FD', fontSize: 12, fontWeight: '700' },
  card: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#F1F5F9' },
  cardSub: { fontSize: 12, color: '#94A3B8', marginTop: 2, marginBottom: 12 },
  orderRow: { backgroundColor: '#0F172A', borderRadius: 8, padding: 12, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderTitle: { fontSize: 13, fontWeight: '800', color: '#FFFFFF' },
  orderSub: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  actionBtns: { flexDirection: 'row', gap: 6 },
  assignBtn: { backgroundColor: '#00C853', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6 },
  cancelBtn: { backgroundColor: '#EF4444', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6 },
  disputeBtn: { backgroundColor: '#6200EA', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6 },
  recalcBtn: { backgroundColor: '#EA580C', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  btnText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  zoneRow: { backgroundColor: '#0F172A', borderRadius: 8, padding: 12, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  zoneName: { fontSize: 13, fontWeight: '800', color: '#FB923C' },
  zoneStats: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
});
