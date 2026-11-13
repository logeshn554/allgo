// Job: Main landing screen to select Rides, Grocery, Food, or Parcel delivery.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ServiceCard } from '../components/ServiceCard';
import { AddressBar } from '../components/AddressBar';
import { loadCurrentUser } from '../data/userStorage';

interface Props {
  onNavigate: (page: string) => void;
}

export const HomePage: React.FC<Props> = ({ onNavigate }) => {
  const user = loadCurrentUser();

  return (
    <View style={styles.screen}>
      <AddressBar address={user?.address || 'Select delivery address'} />

      <Text style={styles.brandTitle}>AllGo SuperApp</Text>
      <Text style={styles.subtitle}>Fast delivery & quick rides</Text>

      <View style={styles.servicesGrid}>
        <ServiceCard
          title="Rides"
          iconName="rides"
          onPress={() => onNavigate('rides')}
        />
        <ServiceCard
          title="Grocery"
          iconName="grocery"
          onPress={() => onNavigate('grocery')}
        />
      </View>

      <View style={styles.servicesGrid}>
        <ServiceCard
          title="Food"
          iconName="food"
          onPress={() => onNavigate('food')}
        />
        <ServiceCard
          title="Parcel"
          iconName="parcel"
          onPress={() => onNavigate('parcel')}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF', padding: 20 },
  brandTitle: { fontSize: 24, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4, marginBottom: 20 },
  servicesGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
});
