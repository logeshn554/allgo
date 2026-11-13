// Job: Grocery browsing screen with catalog and cart controls.

import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { loadGroceryCatalog, CatalogProduct } from '../data/catalogLoader';
import { saveItemToCart, loadCartItems, CartItem } from '../data/cartStorage';
import { ProductCard } from '../components/ProductCard';
import { CartBar } from '../components/CartBar';

interface Props {
  onGoToCheckout: () => void;
}

export const GroceryPage: React.FC<Props> = ({ onGoToCheckout }) => {
  const [products] = useState<CatalogProduct[]>(() => loadGroceryCatalog());
  const [cart, setCart] = useState<CartItem[]>(() => loadCartItems('grocery'));

  const handleAddToCart = (product: CatalogProduct) => {
    const updated = saveItemToCart('grocery', {
      id: product.id,
      title: product.title,
      priceCents: product.priceCents,
      quantity: 1,
    });
    setCart(updated);
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotalCents = cart.reduce((sum, item) => sum + item.priceCents * item.quantity, 0);

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>InstaGrocery Store</Text>
      <Text style={styles.subtitle}>Delivered in 15 minutes</Text>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProductCard
            title={item.title}
            priceCents={item.priceCents}
            onAdd={() => handleAddToCart(item)}
          />
        )}
        contentContainerStyle={styles.list}
      />

      <CartBar
        itemCount={totalItems}
        subtotalCents={subtotalCents}
        onViewCart={onGoToCheckout}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F9FAFB', padding: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  subtitle: { fontSize: 13, color: '#6B7280', marginBottom: 16 },
  list: { paddingBottom: 100 },
});
