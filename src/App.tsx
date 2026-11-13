// Job: Root app router and view coordinator connecting all pages.

import React, { useState } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { GroceryPage } from './pages/GroceryPage';
import { RideBookingPage } from './pages/RideBookingPage';
import { ParcelPage } from './pages/ParcelPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { TrackOrderPage } from './pages/TrackOrderPage';
import { DriverJobPage } from './pages/DriverJobPage';
import { loadCurrentUser } from './data/userStorage';

export const App: React.FC = () => {
  const [activePage, setActivePage] = useState<string>('home');
  const [activeOrderId, setActiveOrderId] = useState<string>('');
  const user = loadCurrentUser();

  const handleOrderCreated = (orderId: string) => {
    setActiveOrderId(orderId);
    setActivePage('track');
  };

  const renderCurrentPage = () => {
    switch (activePage) {
      case 'login':
        return <LoginPage onLoginSuccess={() => setActivePage('home')} />;
      case 'grocery':
      case 'food':
        return <GroceryPage onGoToCheckout={() => setActivePage('checkout')} />;
      case 'rides':
        return <RideBookingPage onRideBooked={handleOrderCreated} />;
      case 'parcel':
        return <ParcelPage onParcelBooked={handleOrderCreated} />;
      case 'checkout':
        return <CheckoutPage onOrderPlaced={handleOrderCreated} />;
      case 'track':
        return <TrackOrderPage orderId={activeOrderId || 'ORD-DEFAULT'} />;
      case 'driver_job':
        return (
          <DriverJobPage
            orderId={activeOrderId || 'ORD-DEFAULT'}
            onJobComplete={() => setActivePage('home')}
          />
        );
      case 'home':
      default:
        return (
          <HomePage
            onNavigate={(page) => {
              if (page === 'driver') setActivePage('driver_job');
              else setActivePage(page);
            }}
          />
        );
    }
  };

  return <SafeAreaView style={styles.container}>{renderCurrentPage()}</SafeAreaView>;
};

export default App;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
});
