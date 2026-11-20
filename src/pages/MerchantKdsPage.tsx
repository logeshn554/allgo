// Job: Merchant Portal navigation container delegating to LiveOrdersPage (KDS), CatalogPage, and SettlementPage.

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LiveOrdersPage } from './merchant/LiveOrdersPage.tsx';
import { CatalogPage } from './merchant/CatalogPage.tsx';
import { SettlementPage } from './merchant/SettlementPage.tsx';

interface Props {
  onBack: () => void;
}

export const MerchantKdsPage: React.FC<Props> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'kds' | 'catalog' | 'settlement'>('kds');

  return (
    <View style={styles.container}>
      {/* Subsystem Navigation Bar */}
      <View style={styles.topTabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'kds' && styles.tabBtnActive]}
          onPress={() => setActiveTab('kds')}
        >
          <Text style={[styles.tabText, activeTab === 'kds' && styles.tabTextActive]}>
            🍳 Live KDS & Picking
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'catalog' && styles.tabBtnActive]}
          onPress={() => setActiveTab('catalog')}
        >
          <Text style={[styles.tabText, activeTab === 'catalog' && styles.tabTextActive]}>
            📦 SKU Catalog & Busy Mode
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'settlement' && styles.tabBtnActive]}
          onPress={() => setActiveTab('settlement')}
        >
          <Text style={[styles.tabText, activeTab === 'settlement' && styles.tabTextActive]}>
            📊 Payouts & T+1 Ledger
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Screen Content */}
      <View style={styles.tabContent}>
        {activeTab === 'kds' && <LiveOrdersPage onBack={onBack} />}
        {activeTab === 'catalog' && <CatalogPage onBack={onBack} />}
        {activeTab === 'settlement' && <SettlementPage onBack={onBack} />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  topTabBar: { flexDirection: 'row', backgroundColor: '#FFFFFF', padding: 10, gap: 8, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#F1F5F9', alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#6200EA' },
  tabText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  tabTextActive: { color: '#FFFFFF' },
  tabContent: { flex: 1 },
});
