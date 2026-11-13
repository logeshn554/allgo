// Job: Screen to browse grocery products by category and add items to cart.

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { loadGroceryCategories, loadGroceryProducts, GroceryProduct } from '../data/catalogLoader';
import { loadCartItems, saveItemToCart } from '../data/cartStorage';
import { ProductCard } from '../components/ProductCard';
import { CartBar } from '../components/CartBar';

interface Props {
  onBack: () => void;
  onCheckout: () => void;
}

export const GroceryPage: React.FC<Props> = ({ onBack, onCheckout }) => {
  const [category, setCategory] = useState('All');
  const [cart, setCart] = useState(() => loadCartItems('grocery'));
  const products = loadGroceryProducts(category);

  const handleAdd = (product: GroceryProduct) => {
    const updated = saveItemToCart('grocery', {
      id: product.id,
      title: product.title,
      priceCents: product.priceCents,
      quantity: 1,
    });
    setCart(updated);
  };

  return (
    <View style={styles.screen}>
      <TouchableOpacity onPress={onBack}>
        <Text style={styles.back}>← Back to Home</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Instant Grocery</Text>
      <View style={styles.tabs}>
        {loadGroceryCategories().map((cat) => (
          <TouchableOpacity key={cat} style={[styles.tab, category === cat && styles.tabActive]} onPress={() => setCategory(cat)}>
            <Text style={[styles.tabText, category === cat && styles.tabTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView>
        {products.map((p) => (
          <ProductCard key={p.id} product={p} onAdd={handleAdd} />
        ))}
      </ScrollView>
      <CartBar items={cart} onCheckout={onCheckout} />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF', padding: 20 },
  back: { color: '#4F46E5', fontWeight: '600', marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 12 },
  tabs: { flexDirection: 'row', marginBottom: 14, flexWrap: 'wrap' },
  tab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F3F4F6', marginRight: 8, marginBottom: 6 },
  tabActive: { backgroundColor: '#111827' },
  tabText: { fontSize: 12, color: '#4B5563', fontWeight: '600' },
  tabTextActive: { color: '#FFFFFF' },
});
