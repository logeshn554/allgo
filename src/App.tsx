// Job: Connect all screens in src/pages/ across Customer, Driver, Merchant KDS, and Admin God View.

import React, { useState } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { HomePage, ScreenName } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { OtpVerifyPage } from './pages/OtpVerifyPage';
import { GroceryPage } from './pages/GroceryPage';
import { RideBookingPage } from './pages/RideBookingPage';
import { ParcelPage } from './pages/ParcelPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { TrackOrderPage } from './pages/TrackOrderPage';
import { DriverJobPage } from './pages/DriverJobPage';
import { OrderHistoryPage } from './pages/OrderHistoryPage';
import { AddressPickerPage } from './pages/AddressPickerPage';
import { MerchantKdsPage } from './pages/MerchantKdsPage';
import { AdminGodViewPage } from './pages/AdminGodViewPage';
import { OfflineBanner } from './components/OfflineBanner';
import { loadUserProfile } from './data/userStorage';

export default function App() {
  const [screen, setScreen] = useState<ScreenName>('home');
  const [activeOrderId, setActiveOrderId] = useState<string>('ORD-774412');
  const [authPhone, setAuthPhone] = useState<string>('+91 98765 43210');
  const [authRole, setAuthRole] = useState<'customer' | 'driver'>('customer');

  const user = loadUserProfile();

  const openTracking = (orderId: string) => {
    setActiveOrderId(orderId);
    setScreen('track');
  };

  return (
    <SafeAreaView style={styles.container}>
      <OfflineBanner />
      {screen === 'login' && (
        <LoginPage
          onLoginSuccess={() => {
            setAuthPhone('+91 98765 43210');
            setAuthRole('customer');
            setScreen('otp');
          }}
        />
      )}
      {screen === 'otp' && (
        <OtpVerifyPage
          phone={authPhone}
          role={authRole}
          onVerified={() => setScreen('home')}
          onBack={() => setScreen('login')}
        />
      )}
      {screen === 'home' && <HomePage onNavigate={setScreen} />}
      {screen === 'grocery' && (
        <GroceryPage onBack={() => setScreen('home')} onCheckout={() => setScreen('checkout')} />
      )}
      {screen === 'rides' && (
        <RideBookingPage onBack={() => setScreen('home')} onRideBooked={openTracking} />
      )}
      {screen === 'parcel' && (
        <ParcelPage onBack={() => setScreen('home')} onCheckout={() => setScreen('checkout')} />
      )}
      {screen === 'checkout' && (
        <CheckoutPage onBack={() => setScreen('grocery')} onOrderPlaced={openTracking} />
      )}
      {screen === 'track' && (
        <TrackOrderPage
          orderId={activeOrderId}
          onBackHome={() => setScreen('home')}
          onOpenDriverView={() => setScreen('driver')}
        />
      )}
      {screen === 'driver' && (
        <DriverJobPage activeOrderId={activeOrderId} onBack={() => setScreen('home')} />
      )}
      {screen === 'kds' && (
        <MerchantKdsPage onBack={() => setScreen('home')} />
      )}
      {screen === 'admin_dispatch' && (
        <AdminGodViewPage onBack={() => setScreen('home')} />
      )}
      {screen === 'history' && (
        <OrderHistoryPage onBack={() => setScreen('home')} onSelectOrder={openTracking} />
      )}
      {screen === 'address' && (
        <AddressPickerPage
          currentAddress={user?.address || 'MG Road, Bengaluru'}
          onAddressSaved={() => setScreen('home')}
          onBack={() => setScreen('home')}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
});
