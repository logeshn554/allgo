// Job: Main screen to pick Grocery, Rides, Parcel, or Driver Dashboard.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { loadUserProfile } from '../data/userStorage';
import { AddressBar } from '../components/AddressBar';
import { ServiceCard } from '../components/ServiceCard';

export type ScreenName = 'login' | 'home' | 'grocery' | 'rides' | 'parcel' | 'checkout' | 'track' | 'driver';

interface Props {
  onNavigate: (screen: ScreenName) => void;
}

export const HomePage: React.FC<Props> = ({ onNavigate }) => {
  const user = loadUserProfile();

  return (
    <View style={styles.screen}>
      <AddressBar
        address={user?.address || 'Bengaluru'}
        userName={user?.name || 'Guest'}
        onSwitchRole={() => onNavigate('login')}
      />
      <Text style={styles.heading}>What do you need today?</Text>
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
  heading: { fontSize: 22, fontWeight: '800', color: '#111827', marginVertical: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
});
