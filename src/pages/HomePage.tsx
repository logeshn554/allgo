// Job: Main hub screen with services across Customer, Driver, Merchant KDS, and Admin Central Dispatch.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { loadUserProfile } from '../data/userStorage.ts';
import { AddressBar } from '../components/AddressBar.tsx';
import { ServiceCard } from '../components/ServiceCard.tsx';

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
  | 'address'
  | 'kds'
  | 'admin_dispatch'
  | 'customer_onboarding'
  | 'partner_kyc'
  | 'merchant_setup';

interface Props {
  onNavigate: (screen: ScreenName) => void;
}

export const HomePage: React.FC<Props> = ({ onNavigate }) => {
  const user = loadUserProfile();

  return (
    <ScrollView style={styles.screen}>
      <AddressBar
        address={user?.address || 'Select address'}
        userName={user?.name || 'User'}
        onSwitchRole={() => onNavigate('address')}
      />

      <View style={styles.topBar}>
        <Text style={styles.heading}>Services & Subsystems</Text>
        <TouchableOpacity onPress={() => onNavigate('history')}>
          <Text style={styles.historyLink}>📜 Orders</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        <ServiceCard title="Instant Grocery" subtitle="15-min delivery" iconKey="grocery" onPress={() => onNavigate('grocery')} />
        <ServiceCard title="Book a Ride" subtitle="Bike, Auto & Cab" iconKey="rides" onPress={() => onNavigate('rides')} />
        <ServiceCard title="Send Parcel" subtitle="Door-to-door" iconKey="parcel" onPress={() => onNavigate('parcel')} />
        <ServiceCard title="Driver Engine" subtitle="PoD & Earnings" iconKey="bike" onPress={() => onNavigate('driver')} />
        <ServiceCard title="Merchant KDS" subtitle="Prep timers & 86ing" iconKey="grocery" onPress={() => onNavigate('kds')} />
        <ServiceCard title="Central Dispatch" subtitle="God View & Disputes" iconKey="rides" onPress={() => onNavigate('admin_dispatch')} />
      </View>
      <View style={{ height: 30 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF', padding: 20 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 12 },
  heading: { fontSize: 20, fontWeight: '800', color: '#0F172A' },
  historyLink: { color: '#6200EA', fontWeight: '800', fontSize: 13 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
});
