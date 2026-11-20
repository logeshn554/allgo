// Job: Driver Duty Console managing shift state, telemetry stream, 15s dispatch offer modal, and active trip lifecycle.

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import {
  type GpsCoords,
  type DriverTelemetryPing,
  startDriverTelemetryStream,
} from '../../data/gpsLoader.ts';
import {
  DriverVertical,
  DispatchOffer,
  loadDriverVerticalPreferences,
  saveDriverVerticalPreferences,
  acceptDispatchOffer,
  rejectDispatchOffer,
  subscribeToDispatchOffers,
} from '../../data/driverDispatchService.ts';
import {
  DriverActiveTrip,
  loadDriverActiveTrip,
  saveDriverActiveTrip,
  verifyPickupGate,
  verifyDropPoD,
  generateGoogleMapsDeepLink,
} from '../../data/driverTripExecution.ts';
import { MultiVerticalShiftBar } from '../../components/driver/MultiVerticalShiftBar.tsx';
import { DispatchOfferModal } from '../../components/driver/DispatchOfferModal.tsx';
import { ActiveTripCard } from '../../components/driver/ActiveTripCard.tsx';
import { TripVerificationGateModal } from '../../components/driver/TripVerificationGateModal.tsx';

interface Props {
  onBack: () => void;
}

export const DutyConsolePage: React.FC<Props> = ({ onBack }) => {
  const [isOnline, setIsOnline] = useState(true);
  const [verticals, setVerticals] = useState<DriverVertical[]>(() => loadDriverVerticalPreferences());
  const [activeTrip, setActiveTrip] = useState<DriverActiveTrip | null>(() => loadDriverActiveTrip());
  const [dispatchOffer, setDispatchOffer] = useState<DispatchOffer | null>(null);
  const [driverCoords, setDriverCoords] = useState<GpsCoords>({ lat: 12.9716, lng: 77.5946 });
  const [verificationModal, setVerificationModal] = useState<'PICKUP' | 'DROP' | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Background/foreground GPS telemetry streaming
  useEffect(() => {
    if (!isOnline) return;

    const stopStream = startDriverTelemetryStream({
      driverId: 'drv_live_partner_1',
      isTripActive: Boolean(activeTrip && activeTrip.status !== 'DELIVERED'),
      onPing: (ping: DriverTelemetryPing) => {
        setDriverCoords({ lat: ping.lat, lng: ping.lng });
      },
    });

    return stopStream;
  }, [isOnline, activeTrip?.status]);

  // Radial Dispatch Offer Subscription
  useEffect(() => {
    if (!isOnline || activeTrip) return;

    const unsubscribe = subscribeToDispatchOffers((offer) => {
      setDispatchOffer(offer);
    });

    return unsubscribe;
  }, [isOnline, activeTrip]);

  const handleToggleOnline = () => {
    setIsOnline((o) => !o);
    setFeedback(isOnline ? 'You are now OFFLINE.' : 'You are now ONLINE and ready for dispatch offers.');
  };

  const handleToggleVertical = (v: DriverVertical) => {
    const updated = verticals.includes(v)
      ? verticals.filter((item) => item !== v)
      : [...verticals, v];
    setVerticals(updated);
    saveDriverVerticalPreferences(updated);
  };

  const handleAcceptOffer = async (offerId: string) => {
    await acceptDispatchOffer(offerId);
    setDispatchOffer(null);
    const newTrip = loadDriverActiveTrip();
    setActiveTrip(newTrip);
    setFeedback('Offer accepted! Navigate to pickup destination.');
  };

  const handleRejectOffer = async (offerId: string) => {
    await rejectDispatchOffer(offerId);
    setDispatchOffer(null);
  };

  const handleLaunchNavigation = (coords: GpsCoords, label: string) => {
    const url = generateGoogleMapsDeepLink(coords, label);
    Linking.openURL(url).catch(() => {
      setFeedback(`Navigating to: ${label}`);
    });
  };

  return (
    <ScrollView style={styles.screen}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backLink}>← Return Home</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Partner Duty & Navigation Console</Text>
      </View>

      {/* Online/Offline & Multi-Vertical Shift Bar */}
      <MultiVerticalShiftBar
        isOnline={isOnline}
        selectedVerticals={verticals}
        onToggleOnline={handleToggleOnline}
        onToggleVertical={handleToggleVertical}
      />

      {feedback && (
        <View style={styles.alertBanner}>
          <Text style={styles.alertText}>{feedback}</Text>
        </View>
      )}

      {/* Active Trip Details */}
      {activeTrip && (
        <ActiveTripCard
          activeTrip={activeTrip}
          driverCoords={driverCoords}
          onLaunchNavigation={handleLaunchNavigation}
          onArrivedAtPickup={() => {
            activeTrip.status = 'ARRIVED_AT_PICKUP';
            saveDriverActiveTrip(activeTrip);
            setActiveTrip({ ...activeTrip });
          }}
          onArrivedAtDrop={() => {
            activeTrip.status = 'ARRIVED_AT_DROP';
            saveDriverActiveTrip(activeTrip);
            setActiveTrip({ ...activeTrip });
          }}
          onOpenVerificationModal={(type) => setVerificationModal(type)}
        />
      )}

      {/* 15s Radial Dispatch Offer Modal */}
      <DispatchOfferModal
        visible={Boolean(dispatchOffer)}
        offer={dispatchOffer}
        onAccept={handleAcceptOffer}
        onReject={handleRejectOffer}
      />

      {/* Verification Gate Modal */}
      {activeTrip && (
        <TripVerificationGateModal
          visible={Boolean(verificationModal)}
          gateType={verificationModal || 'PICKUP'}
          trip={activeTrip}
          onVerifyPickup={(code) => {
            const res = verifyPickupGate(activeTrip, code);
            setFeedback(res.message);
            if (res.success && res.updatedTrip) {
              setActiveTrip({ ...res.updatedTrip });
              setVerificationModal(null);
            }
          }}
          onVerifyDrop={(otp, photo) => {
            const res = verifyDropPoD(activeTrip, otp, photo);
            setFeedback(res.message);
            if (res.success && res.updatedTrip) {
              setActiveTrip({ ...res.updatedTrip });
              setVerificationModal(null);
            }
          }}
          onClose={() => setVerificationModal(null)}
        />
      )}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  topBar: { marginBottom: 12 },
  backLink: { color: '#6200EA', fontWeight: '800', fontSize: 13, marginBottom: 4 },
  title: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  alertBanner: { backgroundColor: '#EFF6FF', borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#BFDBFE' },
  alertText: { color: '#1E40AF', fontSize: 12, fontWeight: '700' },
});
