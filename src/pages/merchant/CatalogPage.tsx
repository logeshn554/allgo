// Job: Real-time Catalog & Inventory Sync with 1-tap SKU toggle, Store Busy-Mode, and prep buffers.

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import {
  loadSkuCatalog,
  toggleSkuStock,
  loadStoreSettings,
  toggleStoreBusyMode,
  updatePrepBuffer,
  SkuCatalogItem,
  StoreOperationalSettings,
} from '../../data/merchantInventoryApi.ts';
import { StoreBusyControls } from '../../components/merchant/StoreBusyControls.tsx';
import { SkuStockToggleRow } from '../../components/merchant/SkuStockToggleRow.tsx';

interface Props {
  onBack: () => void;
}

export const CatalogPage: React.FC<Props> = ({ onBack }) => {
  const [catalog, setCatalog] = useState<SkuCatalogItem[]>(() => loadSkuCatalog());
  const [settings, setSettings] = useState<StoreOperationalSettings>(() => loadStoreSettings());
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [feedback, setFeedback] = useState<string | null>(null);

  const categories = ['ALL', ...new Set(catalog.map((i) => i.category))];

  const handleToggleSku = async (skuId: string) => {
    const res = await toggleSkuStock(skuId);
    setCatalog(loadSkuCatalog());
    if (res.item) {
      setFeedback(
        `SKU [${res.item.sku}] marked ${res.item.isAvailable ? 'IN STOCK' : '86ed (OUT OF STOCK)'}. Redis catalog cache invalidated.`
      );
    }
  };

  const handleToggleBusy = async (mins: number) => {
    const updated = await toggleStoreBusyMode(mins);
    setSettings({ ...updated });
    setFeedback(
      mins > 0
        ? `Store Busy Mode activated! Paused incoming orders for ${mins} mins.`
        : `Store marked OPEN. Normal order intake resumed.`
    );
  };

  const handleBufferChange = (mins: number) => {
    const updated = updatePrepBuffer(mins);
    setSettings({ ...updated });
    setFeedback(`Peak rush prep buffer updated to +${mins}m.`);
  };

  const filteredItems =
    selectedCategory === 'ALL'
      ? catalog
      : catalog.filter((i) => i.category === selectedCategory);

  return (
    <ScrollView style={styles.screen}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backLink}>← Return Home</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Live Inventory & Store Operations</Text>
      </View>

      {/* Operational Busy Mode & Prep Controls */}
      <StoreBusyControls
        settings={settings}
        onToggleBusy={handleToggleBusy}
        onBufferChange={handleBufferChange}
      />

      {/* Feedback Banner */}
      {feedback && (
        <View style={styles.alertBanner}>
          <Text style={styles.alertText}>{feedback}</Text>
        </View>
      )}

      {/* Category Filter Pills */}
      <View style={styles.catRow}>
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.catPill, selectedCategory === cat && styles.catPillActive]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[styles.catText, selectedCategory === cat && styles.catTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* SKU Catalog List */}
      <Text style={styles.sectionHeader}>
        1-Tap SKU 86ing Catalog ({filteredItems.length} items)
      </Text>
      <Text style={styles.sectionSub}>
        Toggling an item instantly updates customer mobile apps and clears the Redis catalog cache.
      </Text>

      {filteredItems.map((item) => (
        <SkuStockToggleRow
          key={item.id}
          item={item}
          onToggle={handleToggleSku}
        />
      ))}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  topBar: { marginBottom: 12 },
  backLink: { color: '#6200EA', fontWeight: '800', fontSize: 13, marginBottom: 4 },
  pageTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  alertBanner: { backgroundColor: '#EFF6FF', borderRadius: 8, padding: 10, marginBottom: 14, borderWidth: 1, borderColor: '#BFDBFE' },
  alertText: { color: '#1E40AF', fontSize: 12, fontWeight: '700' },
  catRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginBottom: 14 },
  catPill: { backgroundColor: '#E2E8F0', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  catPillActive: { backgroundColor: '#6200EA' },
  catText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  catTextActive: { color: '#FFF' },
  sectionHeader: { fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 2 },
  sectionSub: { fontSize: 11, color: '#64748B', marginBottom: 12 },
});
