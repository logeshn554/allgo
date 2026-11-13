// Job: Offline banner indicating mobile network disconnection.

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

export const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleOnline = () => setIsOffline(false);
      const handleOffline = () => setIsOffline(true);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  if (!isOffline) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>⚠️ No Internet Connection. Working in Offline Mode.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: { backgroundColor: '#EF4444', paddingVertical: 8, paddingHorizontal: 16, alignItems: 'center' },
  text: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
});
