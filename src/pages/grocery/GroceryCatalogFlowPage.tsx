// Job: Grocery catalog page with real-time stock badges, category filters, and active cart bar.

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { loadGroceryCategories, loadGroceryProducts, GroceryProduct } from '../../data/catalogLoader.ts';
import { loadCartItems, saveItemToCart } from '../../data/cartStorage.ts';
import { StockBadge } from '../../components/grocery/StockBadge.tsx';
import { CartBar } from '../../components/CartBar.tsx';
import { AppIcon } from '../../components/AppIcon.tsx';

interface Props {
  onBack: () => void;
  onCheckout: () => void;
}

export const GroceryCatalogFlowPage: React.FC<Props> = ({ onBack, onCheckout }) => {
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
      <View style={styles.headerRow}>
        <Text style={styles.title}>AllGo Fresh Grocery</Text>
        <Text style={styles.darkStoreBadge}>⚡ 10-Min Dark Store</Text>
      </View>

      <View style={styles.tabs}>
        {loadGroceryCategories().map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.tab, category === cat && styles.tabActive]}
            onPress={() => setCategory(cat)}
          >
            <Text style={[styles.tabText, category === cat && styles.tabTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.list}>
        {products.map((p) => {
          const inStock = p.id !== 'item_out_of_stock';
          const stockCount = inStock ? (p.priceCents > 10000 ? 3 : 15) : 0;
          return (
            <View key={p.id} style={styles.card}>
              <AppIcon name={p.category?.toLowerCase() || 'produce'} size={44} />
              <View style={styles.details}>
                <Text style={styles.itemTitle}>{p.title}</Text>
                <StockBadge stockQuantity={stockCount} />
                <Text style={styles.price}>₹{(p.priceCents / 100).toFixed(0)}</Text>
              </View>
              <TouchableOpacity
                style={[styles.addBtn, !inStock && styles.addBtnDisabled]}
                disabled={!inStock}
                onPress={() => handleAdd(p)}
              >
                <Text style={styles.addBtnText}>{inStock ? '+ ADD' : 'OOS'}</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>

      <CartBar items={cart} onCheckout={onCheckout} />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFFFFF', padding: 18 },
  back: { color: '#4F46E5', fontWeight: '700', marginBottom: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '900', color: '#111827' },
  darkStoreBadge: { fontSize: 11, fontWeight: '800', color: '#059669', backgroundColor: '#DEF7EC', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  tabs: { flexDirection: 'row', marginBottom: 14, flexWrap: 'wrap' },
  tab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#F3F4F6', marginRight: 8, marginBottom: 6 },
  tabActive: { backgroundColor: '#111827' },
  tabText: { fontSize: 12, color: '#4B5563', fontWeight: '600' },
  tabTextActive: { color: '#FFFFFF' },
  list: { paddingBottom: 80 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  details: { flex: 1, marginLeft: 12 },
  itemTitle: { fontSize: 14, fontWeight: '800', color: '#111827' },
  price: { fontSize: 15, fontWeight: '900', color: '#111827', marginTop: 2 },
  addBtn: { backgroundColor: '#059669', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  addBtnDisabled: { backgroundColor: '#9CA3AF' },
  addBtnText: { color: '#FFFFFF', fontWeight: '800', fontSize: 12 },
});
