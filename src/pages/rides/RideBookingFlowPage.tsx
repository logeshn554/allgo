// Job: Complete Ride-Hailing flow container with multi-stop autocomplete, signed fare tiers, map tracking, OTP banner, and SOS.

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { RideMultiStopPicker, StopLocation } from '../../components/rides/RideMultiStopPicker.tsx';
import { VehicleTierSelector, VehicleTierOption } from '../../components/rides/VehicleTierSelector.tsx';
import { LiveDriverTrackingMap } from '../../components/rides/LiveDriverTrackingMap.tsx';
import { RideOtpBanner } from '../../components/rides/RideOtpBanner.tsx';
import { RideEmergencySosButton } from '../../components/rides/RideEmergencySosButton.tsx';
import { saveNewOrder } from '../../data/orderStorage.ts';

interface Props {
  onBack: () => void;
  onRideBooked: (orderId: string) => void;
}

const DEFAULT_TIERS: VehicleTierOption[] = [
  { id: 'bike', name: 'AllGo Bike', iconName: 'bike', capacity: 1, etaMins: 3, baseFareInr: 45, quoteId: 'quote_bike_9921', signature: 'sig_hmac_bike_9921' },
  { id: 'auto', name: 'AllGo Auto', iconName: 'auto', capacity: 3, etaMins: 4, baseFareInr: 75, quoteId: 'quote_auto_8832', signature: 'sig_hmac_auto_8832' },
  { id: 'cab_mini', name: 'Cab Mini', iconName: 'cabEconomy', capacity: 4, etaMins: 6, baseFareInr: 165, quoteId: 'quote_mini_7714', signature: 'sig_hmac_mini_7714' },
  { id: 'prime_suv', name: 'Prime SUV', iconName: 'cabPremium', capacity: 6, etaMins: 8, baseFareInr: 280, quoteId: 'quote_suv_6605', signature: 'sig_hmac_suv_6605' },
];

export const RideBookingFlowPage: React.FC<Props> = ({ onBack, onRideBooked }) => {
  const [step, setStep] = useState<'configure' | 'active_ride'>('configure');
  const [pickup, setPickup] = useState<StopLocation>({ id: 'p_1', address: 'Indiranagar 100ft Road, Bengaluru', latitude: 12.9716, longitude: 77.5946 });
  const [dropoffs, setDropoffs] = useState<StopLocation[]>([
    { id: 'd_1', address: 'Koramangala Sony World Signal, Bengaluru', latitude: 12.9352, longitude: 77.6245 },
  ]);
  const [selectedTier, setSelectedTier] = useState<VehicleTierOption>(DEFAULT_TIERS[1]!);
  const [activeOrderId, setActiveOrderId] = useState('RIDE-44219');
  const [rideOtp] = useState('4821');

  const handleConfirmBooking = () => {
    const order = saveNewOrder(
      [{ id: selectedTier.id, title: `Ride (${selectedTier.name})`, priceCents: selectedTier.baseFareInr * 100, quantity: 1 }],
      selectedTier.baseFareInr * 100
    );
    setActiveOrderId(order.id);
    setStep('active_ride');
    onRideBooked(order.id);
  };

  return (
    <ScrollView style={styles.screen}>
      <TouchableOpacity onPress={onBack}>
        <Text style={styles.backLink}>← Back to Home</Text>
      </TouchableOpacity>
      <Text style={styles.title}>AllGo Mobility & Rides</Text>

      {step === 'configure' ? (
        <>
          <RideMultiStopPicker
            pickup={pickup}
            dropoffs={dropoffs}
            onPickupChange={setPickup}
            onDropoffsChange={setDropoffs}
          />
          <VehicleTierSelector
            tiers={DEFAULT_TIERS}
            selectedTierId={selectedTier.id}
            onSelectTier={setSelectedTier}
          />
          <TouchableOpacity style={styles.bookBtn} onPress={handleConfirmBooking}>
            <Text style={styles.bookBtnText}>Book {selectedTier.name} (₹{selectedTier.baseFareInr})</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <RideOtpBanner otp={rideOtp} />
          <LiveDriverTrackingMap
            driverLocation={{ latitude: 12.965, longitude: 77.605 }}
            dropoffLocation={{ latitude: dropoffs[0]?.latitude || 12.935, longitude: dropoffs[0]?.longitude || 77.624 }}
            etaMinutes={selectedTier.etaMins}
            distanceKm={5.2}
          />
          <RideEmergencySosButton
            orderId={activeOrderId}
            currentLocation={pickup}
          />
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF', padding: 18 },
  backLink: { color: '#4F46E5', fontWeight: '700', marginBottom: 10 },
  title: { fontSize: 22, fontWeight: '900', color: '#111827', marginBottom: 16 },
  bookBtn: { backgroundColor: '#4F46E5', padding: 16, borderRadius: 14, alignItems: 'center', marginTop: 10, marginBottom: 24 },
  bookBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
