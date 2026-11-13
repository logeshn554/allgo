// Job: Main screen to pick Grocery, Rides, Parcel, or view Order History.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { loadUserProfile } from '../data/userStorage';
import { AddressBar } from '../components/AddressBar';
import { ServiceCard } from '../components/ServiceCard';

export type ScreenName =
  | 'login'
  | 'otp'
  | 'home'
  | 'grocery'
  | 'rides'
  | 'parcel'
  | 'checkout'
  | 'track'
  | 'driver'
  | 'history'
  | 'address';

interface Props {
  onNavigate: (screen: ScreenName) => void;
}

export const HomePage: React.FC<Props> = ({ onNavigate }) => {
  const user = loadUserProfile();

  return (
    <View style={styles.screen}>
      <AddressBar
        address={user?.address || 'Select address'}
        userName={user?.name || 'User'}
        onSwitchRole={() => onNavigate('address')}
      />

      <View style={styles.topBar}>
        <Text style={styles.heading}>Services</Text>
        <TouchableOpacity onPress={() => onNavigate('history')}>
          <Text style={styles.historyLink}>📜 Orders</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        <ServiceCard title="Instant Grocery" subtitle="15-min delivery" iconKey="grocery" onPress={() => onNavigate('grocery')} />
        <ServiceCard title="Book a Ride" subtitle="Bike, Auto & Cab" iconKey="rides" onPress={() => onNavigate('rides')} />
        <ServiceCard title="Send Parcel" subtitle="Door-to-door" iconKey="parcel" onPress={() => onNavigate('parcel')} />
        <ServiceCard title="Driver Partner" subtitle="Verify & earn" iconKey="bike" onPress={() => onNavigate('driver')} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF', padding: 20 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 12 },
  heading: { fontSize: 22, fontWeight: '800', color: '#111827' },
  historyLink: { color: '#4F46E5', fontWeight: '700', fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
});
