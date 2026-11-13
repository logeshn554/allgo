// Job: Connect all screens in src/pages/ so the user can navigate the app.

import React, { useState } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { HomePage, ScreenName } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { GroceryPage } from './pages/GroceryPage';
import { RideBookingPage } from './pages/RideBookingPage';
import { ParcelPage } from './pages/ParcelPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { TrackOrderPage } from './pages/TrackOrderPage';
import { DriverJobPage } from './pages/DriverJobPage';

export default function App() {
  const [screen, setScreen] = useState<ScreenName>('home');
  const [activeOrderId, setActiveOrderId] = useState<string>('');

  const openTracking = (orderId: string) => {
    setActiveOrderId(orderId);
    setScreen('track');
  };

  return (
    <SafeAreaView style={styles.container}>
      {screen === 'login' && <LoginPage onLoginSuccess={() => setScreen('home')} />}
      {screen === 'home' && <HomePage onNavigate={setScreen} />}
      {screen === 'grocery' && <GroceryPage onBack={() => setScreen('home')} onCheckout={() => setScreen('checkout')} />}
      {screen === 'rides' && <RideBookingPage onBack={() => setScreen('home')} onRideBooked={openTracking} />}
      {screen === 'parcel' && <ParcelPage onBack={() => setScreen('home')} onCheckout={() => setScreen('checkout')} />}
      {screen === 'checkout' && <CheckoutPage onBack={() => setScreen('grocery')} onOrderPlaced={openTracking} />}
      {screen === 'track' && (
        <TrackOrderPage
          orderId={activeOrderId}
          onBackHome={() => setScreen('home')}
          onOpenDriverView={() => setScreen('driver')}
        />
      )}
      {screen === 'driver' && <DriverJobPage activeOrderId={activeOrderId} onBack={() => setScreen('home')} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
});
