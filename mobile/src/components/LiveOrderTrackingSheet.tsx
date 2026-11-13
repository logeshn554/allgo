import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { io, Socket } from 'socket.io-client';

interface Coordinate {
  latitude: number;
  longitude: number;
}

interface LiveOrderTrackingProps {
  orderId: string;
  authToken: string;
  deliveryOtp: string;
  pickupCoords: Coordinate;
  dropoffCoords: Coordinate;
}

export const LiveOrderTrackingSheet: React.FC<LiveOrderTrackingProps> = ({
  orderId,
  authToken,
  deliveryOtp,
  pickupCoords,
  dropoffCoords,
}) => {
  const mapRef = useRef<MapView | null>(null);
  const [driverCoords, setDriverCoords] = useState<Coordinate | null>(null);
  const [orderStatus, setOrderStatus] = useState<'PLACED' | 'PREPARING' | 'ON_THE_WAY' | 'ARRIVED'>('PLACED');
  const snapPoints = ['25%', '50%', '85%'];

  useEffect(() => {
    const socket: Socket = io(process.env.EXPO_PUBLIC_WS_URL || 'wss://api.allgo.internal', {
      auth: { token: authToken },
      transports: ['websocket'],
    });

    socket.emit('joinRoom', { room: `order:${orderId}` });

    socket.on('driverLocationUpdate', (data: { lat: number; lng: number }) => {
      const nextCoord = { latitude: data.lat, longitude: data.lng };
      setDriverCoords(nextCoord);

      mapRef.current?.animateCamera({
        center: nextCoord,
        zoom: 16,
      });
    });

    socket.on('orderStatusChange', (data: { status: any }) => {
      setOrderStatus(data.status);
    });

    return () => {
      socket.disconnect();
    };
  }, [orderId, authToken]);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: pickupCoords.latitude,
          longitude: pickupCoords.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        <Marker coordinate={pickupCoords} title="Pickup Location" pinColor="green" />
        <Marker coordinate={dropoffCoords} title="Delivery Location" pinColor="red" />
        {driverCoords && (
          <Marker coordinate={driverCoords} title="Driver Position" pinColor="blue" />
        )}
        {driverCoords && (
          <Polyline
            coordinates={[driverCoords, dropoffCoords]}
            strokeColor="#1E90FF"
            strokeWidth={4}
          />
        )}
      </MapView>

      <BottomSheet snapPoints={snapPoints} index={1}>
        <View style={styles.sheetContent}>
          <Text style={styles.statusTitle}>Status: {orderStatus}</Text>

          <View style={styles.stepperContainer}>
            {['PLACED', 'PREPARING', 'ON_THE_WAY', 'ARRIVED'].map((step, idx) => (
              <View
                key={step}
                style={[
                  styles.stepperDot,
                  orderStatus === step && styles.stepperDotActive,
                ]}
              >
                <Text style={styles.stepperText}>{idx + 1}</Text>
              </View>
            ))}
          </View>

          <View style={styles.otpCard}>
            <Text style={styles.otpLabel}>Delivery Verification PIN</Text>
            <Text style={styles.otpValue}>{deliveryOtp}</Text>
            <Text style={styles.otpDisclaimer}>
              Share this code only when driver arrives at your door.
            </Text>
          </View>
        </View>
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: Dimensions.get('window').width, height: Dimensions.get('window').height },
  sheetContent: { padding: 24, alignItems: 'center' },
  statusTitle: { fontSize: 20, fontWeight: '700', marginBottom: 16 },
  stepperContainer: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginVertical: 12 },
  stepperDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#E0E0E0', justifyContent: 'center', alignItems: 'center' },
  stepperDotActive: { backgroundColor: '#00C853' },
  stepperText: { color: '#FFF', fontWeight: 'bold' },
  otpCard: { width: '100%', backgroundColor: '#F4F6F8', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  otpLabel: { fontSize: 13, color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1 },
  otpValue: { fontSize: 32, fontWeight: '900', letterSpacing: 8, marginVertical: 8, color: '#111827' },
  otpDisclaimer: { fontSize: 12, color: '#9CA3AF', textAlign: 'center' },
});
