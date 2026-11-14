// Job: Driver partner console with acceptance timer, turn-by-turn deep-link, PoD options, and offline queue.

import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { updateOrderStatus } from '../data/orderStorage.ts';
import { verifyProofOfDelivery, PodMethod } from '../data/proofOfDeliveryService.ts';
import { launchNavigation, NavigationProvider } from '../data/navigationLauncher.ts';
import { getOfflineQueue, enqueueOfflineAction, flushOfflineQueue } from '../data/offlineActionQueue.ts';
import { loadDriverEarnings, requestInstantPayout, DriverWalletBreakdown } from '../data/driverWalletService.ts';
import { DriverWalletView } from '../components/DriverWalletView.tsx';

interface Props {
  activeOrderId: string | null;
  onBack: () => void;
}

export const DriverJobPage: React.FC<Props> = ({ activeOrderId, onBack }) => {
  const [orderId, setOrderId] = useState(activeOrderId || 'ORD-882319');
  const [podMethod, setPodMethod] = useState<PodMethod>('PIN');
  const [pin, setPin] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [signature, setSignature] = useState('');
  const [feedback, setFeedback] = useState('');
  const [timer, setTimer] = useState(25); // 25s acceptance countdown
  const [offerAccepted, setOfferAccepted] = useState(false);
  const [queueCount, setQueueCount] = useState(0);
  const [wallet, setWallet] = useState<DriverWalletBreakdown>(() => loadDriverEarnings());
  const [activeTab, setActiveTab] = useState<'job' | 'wallet'>('job');

  useEffect(() => {
    setQueueCount(getOfflineQueue().length);
    if (!offerAccepted && timer > 0) {
      const interval = setInterval(() => setTimer((t) => Math.max(0, t - 1)), 1000);
      return () => clearInterval(interval);
    }
  }, [offerAccepted, timer]);

  const handleAcceptOrder = () => {
    setOfferAccepted(true);
    updateOrderStatus(orderId, 'matched');
    setFeedback('Order accepted! Navigate to pickup outlet.');
  };

  const handleStartTrip = () => {
    updateOrderStatus(orderId, 'on_the_way');
    enqueueOfflineAction('STATUS_TRANSITION', { orderId, status: 'on_the_way' });
    setQueueCount(getOfflineQueue().length);
    setFeedback('Trip started. GPS background tracking active.');
  };

  const handleNavigation = (provider: NavigationProvider) => {
    const res = launchNavigation(provider, {
      latitude: 12.9716,
      longitude: 77.5946,
      label: `Customer Order ${orderId}`,
    });
    setFeedback(`Deep-linked into ${provider.toUpperCase()}: ${res.uri.substring(0, 35)}...`);
  };

  const handleCompleteDelivery = () => {
    const res = verifyProofOfDelivery({
      orderId,
      method: podMethod,
      deliveryPin: pin,
      photoUrl,
      signatureDataUri: signature,
      latitude: 12.9716,
      longitude: 77.5946,
    });

    setFeedback(res.message);
    if (res.success) {
      setWallet(loadDriverEarnings());
    }
  };

  const handleSyncOffline = async () => {
    const syncRes = await flushOfflineQueue();
    setQueueCount(syncRes.remainingQueueSize);
    setFeedback(`Synced ${syncRes.processedCount} queued offline actions.`);
  };

  const handleInstantPayout = () => {
    const res = requestInstantPayout(wallet.availableBalanceCents);
    setFeedback(res.message);
    if (res.success) {
      setWallet(loadDriverEarnings());
    }
  };

  return (
    <ScrollView style={styles.screen}>
      <TouchableOpacity onPress={onBack}>
        <Text style={styles.back}>← Back to Home</Text>
      </TouchableOpacity>
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'job' && styles.tabBtnActive]}
          onPress={() => setActiveTab('job')}
        >
          <Text style={[styles.tabText, activeTab === 'job' && styles.tabTextActive]}>Active Trip & PoD</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'wallet' && styles.tabBtnActive]}
          onPress={() => setActiveTab('wallet')}
        >
          <Text style={[styles.tabText, activeTab === 'wallet' && styles.tabTextActive]}>Driver Wallet & Payout</Text>
        </TouchableOpacity>
      </View>

      {queueCount > 0 && (
        <View style={styles.offlineQueueBox}>
          <Text style={styles.offlineText}>📡 {queueCount} actions queued offline during dead zone</Text>
          <TouchableOpacity style={styles.syncBtn} onPress={handleSyncOffline}>
            <Text style={styles.syncText}>Sync Now</Text>
          </TouchableOpacity>
        </View>
      )}

      {activeTab === 'job' ? (
        <View>
          {!offerAccepted && (
            <View style={styles.offerCard}>
              <View style={styles.offerRow}>
                <Text style={styles.offerTitle}>Incoming Delivery Broadcast</Text>
                <View style={[styles.timerBadge, timer < 8 && styles.timerBadgeUrgent]}>
                  <Text style={styles.timerText}>{timer}s</Text>
                </View>
              </View>
              <Text style={styles.offerSubtitle}>Est. Earnings: ₹95 • Distance: 3.8 km</Text>
              <TouchableOpacity
                style={[styles.acceptBtn, timer === 0 && styles.acceptBtnDisabled]}
                onPress={handleAcceptOrder}
                disabled={timer === 0}
              >
                <Text style={styles.acceptBtnText}>
                  {timer === 0 ? 'Offer Expired (Cascaded)' : 'Accept Order'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.label}>Active Order ID</Text>
          <TextInput style={styles.input} value={orderId} onChangeText={setOrderId} placeholder="Order ID" />

          <Text style={styles.label}>Turn-by-Turn Navigation</Text>
          <View style={styles.navRow}>
            <TouchableOpacity style={styles.navBtn} onPress={() => handleNavigation('google')}>
              <Text style={styles.navText}>Google Maps</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navBtn} onPress={() => handleNavigation('waze')}>
              <Text style={styles.navText}>Waze</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navBtn} onPress={() => handleNavigation('apple')}>
              <Text style={styles.navText}>Apple Maps</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.stepBtn} onPress={handleStartTrip}>
            <Text style={styles.stepText}>Start Trip to Customer</Text>
          </TouchableOpacity>

          <Text style={[styles.label, { marginTop: 14 }]}>Proof of Delivery (Compulsory Handover)</Text>
          <View style={styles.podRow}>
            {(['PIN', 'PHOTO', 'SIGNATURE'] as const).map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.podBtn, podMethod === m && styles.podBtnActive]}
                onPress={() => setPodMethod(m)}
              >
                <Text style={[styles.podText, podMethod === m && styles.podTextActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {podMethod === 'PIN' && (
            <TextInput
              style={styles.input}
              value={pin}
              onChangeText={setPin}
              placeholder="Enter Customer's 4-Digit PIN"
              maxLength={4}
            />
          )}

          {podMethod === 'PHOTO' && (
            <View style={styles.photoContainer}>
              <TextInput
                style={styles.input}
                value={photoUrl}
                onChangeText={setPhotoUrl}
                placeholder="Camera Photo URL (e.g. storage/proof_123.jpg)"
              />
              <TouchableOpacity
                style={styles.simCamBtn}
                onPress={() => setPhotoUrl(`storage/proof_drop_${Date.now()}.jpg`)}
              >
                <Text style={styles.simCamText}>📸 Capture Drop-off Photo</Text>
              </TouchableOpacity>
            </View>
          )}

          {podMethod === 'SIGNATURE' && (
            <View style={styles.photoContainer}>
              <TextInput
                style={styles.input}
                value={signature}
                onChangeText={setSignature}
                placeholder="Digital signature captured"
              />
              <TouchableOpacity
                style={styles.simCamBtn}
                onPress={() => setSignature(`data:image/svg+xml;sign_${Date.now()}`)}
              >
                <Text style={styles.simCamText}>✍️ Capture Customer Signature</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={styles.verifyBtn} onPress={handleCompleteDelivery}>
            <Text style={styles.verifyText}>Verify PoD & Complete Drop-off</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <DriverWalletView wallet={wallet} onInstantPayout={handleInstantPayout} />
      )}

      {Boolean(feedback) && <Text style={styles.feedback}>{feedback}</Text>}
      <View style={{ height: 30 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF', padding: 20 },
  back: { color: '#6200EA', fontWeight: '700', marginBottom: 8 },
  tabBar: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#6200EA', borderColor: '#6200EA' },
  tabText: { fontSize: 13, fontWeight: '700', color: '#64748B' },
  tabTextActive: { color: '#FFFFFF' },
  offlineQueueBox: { backgroundColor: '#FEF3C7', borderRadius: 8, padding: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  offlineText: { fontSize: 12, color: '#92400E', fontWeight: '700' },
  syncBtn: { backgroundColor: '#F59E0B', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  syncText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  offerCard: { backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', borderRadius: 12, padding: 14, marginBottom: 14 },
  offerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  offerTitle: { fontSize: 15, fontWeight: '800', color: '#1E3A8A' },
  timerBadge: { backgroundColor: '#3B82F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  timerBadgeUrgent: { backgroundColor: '#EF4444' },
  timerText: { color: '#FFF', fontWeight: '900', fontSize: 13 },
  offerSubtitle: { fontSize: 13, color: '#1D4ED8', marginTop: 4, marginBottom: 10 },
  acceptBtn: { backgroundColor: '#00C853', padding: 12, borderRadius: 8, alignItems: 'center' },
  acceptBtnDisabled: { backgroundColor: '#94A3B8' },
  acceptBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
  label: { fontSize: 12, fontWeight: '700', color: '#475569', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 10, marginBottom: 10, fontSize: 13 },
  navRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  navBtn: { flex: 1, backgroundColor: '#F1F5F9', borderWidth: 1, borderColor: '#CBD5E1', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  navText: { fontSize: 12, fontWeight: '700', color: '#334155' },
  stepBtn: { backgroundColor: '#EEF2FF', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  stepText: { color: '#4F46E5', fontWeight: '800', fontSize: 13 },
  podRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  podBtn: { flex: 1, paddingVertical: 8, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, alignItems: 'center' },
  podBtnActive: { backgroundColor: '#00C853', borderColor: '#00C853' },
  podText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  podTextActive: { color: '#FFF' },
  photoContainer: { marginBottom: 10 },
  simCamBtn: { backgroundColor: '#E0E7FF', padding: 8, borderRadius: 6, alignItems: 'center', marginTop: 4 },
  simCamText: { color: '#4338CA', fontWeight: '700', fontSize: 12 },
  verifyBtn: { backgroundColor: '#00C853', padding: 14, borderRadius: 10, alignItems: 'center', marginTop: 4 },
  verifyText: { color: '#FFFFFF', fontWeight: '800', fontSize: 14 },
  feedback: { marginTop: 14, fontSize: 13, fontWeight: '700', color: '#0F172A', textAlign: 'center' },
});
