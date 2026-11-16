// Job: Merchant KDS tablet display, 86ing catalog panel, thermal ticket printing, and daily settlements.

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { KdsOrderCard, KdsOrder } from '../components/KdsOrderCard.tsx';
import {
  loadMerchantCatalog,
  toggleItemAvailability,
  loadStoreConfig,
  updateDynamicPrepBuffer,
  MerchantItem,
  StoreOperationalConfig,
} from '../data/merchantCatalogManager';
import { EscPosThermalPrinter } from '../data/thermalPrinterService.ts';
import { generateDailySettlementReport, DailySettlementSummary } from '../data/merchantSettlementService.ts';

interface Props {
  onBack: () => void;
}

const INITIAL_ORDERS: KdsOrder[] = [
  {
    id: 'ORD-901',
    customerName: 'Priya R',
    status: 'NEW',
    prepTimeMinutes: 20,
    minutesRemaining: 18,
    handoverOtp: '8214',
    items: [
      { name: 'Special Chettinad Biryani', quantity: 2, notes: 'Less spicy' },
      { name: 'Garlic Butter Naan (2 pcs)', quantity: 1 },
    ],
  },
  {
    id: 'ORD-902',
    customerName: 'Anand S',
    status: 'PREPARING',
    prepTimeMinutes: 15,
    minutesRemaining: 4, // urgent
    handoverOtp: '3319',
    items: [{ name: 'Paneer Butter Masala', quantity: 1 }],
  },
];

export const MerchantKdsPage: React.FC<Props> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'kds' | 'catalog' | 'settlement'>('kds');
  const [orders, setOrders] = useState<KdsOrder[]>(INITIAL_ORDERS);
  const [catalog, setCatalog] = useState<MerchantItem[]>(() => loadMerchantCatalog());
  const [config, setConfig] = useState<StoreOperationalConfig>(() => loadStoreConfig());
  const [feedback, setFeedback] = useState<string | null>(null);
  const [settlement] = useState<DailySettlementSummary>(() =>
    generateDailySettlementReport('merch_1', [
      { orderId: 'ORD-901', grossFoodCents: 64000, packagingCents: 3000 },
      { orderId: 'ORD-902', grossFoodCents: 22000, packagingCents: 1500 },
      { orderId: 'ORD-899', grossFoodCents: 45000, packagingCents: 2000, refundCents: 5000 },
    ])
  );

  const handleStatusUpdate = (orderId: string, nextStatus: 'PREPARING' | 'READY_FOR_PICKUP') => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: nextStatus } : o))
    );
    setFeedback(`Order #${orderId} marked as ${nextStatus}.`);
  };

  const handlePrint = async (order: KdsOrder) => {
    const res = await EscPosThermalPrinter.printTicket({
      orderId: order.id,
      orderType: 'DELIVERY',
      timestamp: new Date().toLocaleTimeString(),
      customerName: order.customerName,
      handoverOtp: order.handoverOtp,
      items: order.items,
      prepTimeMinutes: order.prepTimeMinutes + config.dynamicPrepBufferMinutes,
    });
    setFeedback(`Printer: ${res.message}`);
  };

  const handleToggle86 = (id: string) => {
    const res = toggleItemAvailability(id);
    setCatalog(loadMerchantCatalog());
    setFeedback(`Item ${res.isAvailable ? 're-stocked' : 'marked Out of Stock (86ed)'}`);
  };

  const handleBufferChange = (buffer: number) => {
    const updated = updateDynamicPrepBuffer(buffer);
    setConfig(updated);
    setFeedback(`Peak rush prep buffer updated to +${buffer} mins.`);
  };

  return (
    <View style={styles.screen}>
      {/* Top Tablet Header */}
      <View style={styles.topHeader}>
        <View style={styles.headerTitleRow}>
          <TouchableOpacity onPress={onBack}>
            <Text style={styles.backLink}>← Return Home</Text>
          </TouchableOpacity>
          <Text style={styles.brandTitle}>AllGo Store & Kitchen Operations Portal</Text>
        </View>

        {/* Subsystem tabs */}
        <View style={styles.tabBar}>
          {(['kds', 'catalog', 'settlement'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tabBtn, activeTab === t && styles.tabBtnActive]}
              onPress={() => setActiveTab(t)}
            >
              <Text style={[styles.tabText, activeTab === t && styles.tabTextActive]}>
                {t === 'kds' ? '🍳 Kitchen Display (KDS)' : t === 'catalog' ? '📦 86ing & Inventory' : '📊 Daily Settlement'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Peak Rush Prep Time Buffer Bar */}
      <View style={styles.rushBar}>
        <Text style={styles.rushLabel}>🔥 Peak Rush Preparation Buffer:</Text>
        {[0, 10, 20, 30].map((mins) => (
          <TouchableOpacity
            key={mins}
            style={[styles.bufferBtn, config.dynamicPrepBufferMinutes === mins && styles.bufferBtnActive]}
            onPress={() => handleBufferChange(mins)}
          >
            <Text style={[styles.bufferText, config.dynamicPrepBufferMinutes === mins && styles.bufferTextActive]}>
              +{mins}m
            </Text>
          </TouchableOpacity>
        ))}
        <Text style={styles.audioAlert}>🔔 Audio Alerts: ON</Text>
      </View>

      {feedback && (
        <View style={styles.alertBanner}>
          <Text style={styles.alertText}>{feedback}</Text>
        </View>
      )}

      {/* Main Tab Content */}
      {activeTab === 'kds' && (
        <ScrollView style={styles.content}>
          <Text style={styles.sectionHeader}>Active Kitchen Queue ({orders.length} tickets)</Text>
          {orders.map((o) => (
            <KdsOrderCard
              key={o.id}
              order={o}
              onUpdateStatus={handleStatusUpdate}
              onPrintTicket={handlePrint}
            />
          ))}
        </ScrollView>
      )}

      {activeTab === 'catalog' && (
        <ScrollView style={styles.content}>
          <Text style={styles.sectionHeader}>Instant Live Catalog & Inventory ("86ing" Items)</Text>
          <Text style={styles.sectionSub}>Tap any item to instantly toggle out-of-stock across customer apps</Text>
          {catalog.map((item) => (
            <View key={item.id} style={styles.catalogItemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.catalogName}>{item.name}</Text>
                <Text style={styles.catalogSub}>₹{(item.priceCents / 100).toFixed(0)} • Prep: {item.prepTimeMinutes}m</Text>
              </View>
              <TouchableOpacity
                style={[styles.stockToggleBtn, item.isAvailable ? styles.inStockBtn : styles.outOfStockBtn]}
                onPress={() => handleToggle86(item.id)}
              >
                <Text style={styles.stockToggleText}>
                  {item.isAvailable ? 'IN STOCK' : '86ed (OUT OF STOCK)'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {activeTab === 'settlement' && (
        <ScrollView style={styles.content}>
          <Text style={styles.sectionHeader}>Daily Net Sales & Settlement Reconciliation</Text>
          <View style={styles.settleCard}>
            <View style={styles.settleRow}>
              <Text style={styles.settleLabel}>Gross Food Sales</Text>
              <Text style={styles.settleVal}>₹{(settlement.totalGrossSalesCents / 100).toFixed(0)}</Text>
            </View>
            <View style={styles.settleRow}>
              <Text style={styles.settleLabel}>Packaging Charges Collected</Text>
              <Text style={styles.settleVal}>+ ₹{(settlement.totalPackagingCents / 100).toFixed(0)}</Text>
            </View>
            <View style={styles.settleRow}>
              <Text style={styles.settleLabel}>Platform Commission (15%)</Text>
              <Text style={[styles.settleVal, { color: '#DC2626' }]}>- ₹{(settlement.totalPlatformCommissionCents / 100).toFixed(0)}</Text>
            </View>
            <View style={styles.settleRow}>
              <Text style={styles.settleLabel}>Customer Refunds Deductions</Text>
              <Text style={[styles.settleVal, { color: '#DC2626' }]}>- ₹{(settlement.totalRefundDeductionsCents / 100).toFixed(0)}</Text>
            </View>
            <View style={styles.settleRow}>
              <Text style={styles.settleLabel}>GST / Tax (5%)</Text>
              <Text style={styles.settleVal}>₹{(settlement.totalGstTaxCents / 100).toFixed(0)}</Text>
            </View>
            <View style={styles.settleDivider} />
            <View style={styles.settleRow}>
              <Text style={styles.netDisburseLabel}>Net Merchant Disbursement</Text>
              <Text style={styles.netDisburseVal}>₹{(settlement.netDisbursementCents / 100).toFixed(0)}</Text>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC' },
  topHeader: { backgroundColor: '#FFFFFF', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  backLink: { color: '#6200EA', fontWeight: '800', fontSize: 13 },
  brandTitle: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  tabBar: { flexDirection: 'row', gap: 8 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: '#F1F5F9', alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#6200EA' },
  tabText: { fontSize: 12, fontWeight: '700', color: '#64748B' },
  tabTextActive: { color: '#FFFFFF' },
  rushBar: { backgroundColor: '#FEF3C7', paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  rushLabel: { fontSize: 12, fontWeight: '800', color: '#92400E' },
  bufferBtn: { backgroundColor: '#FFF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#F59E0B' },
  bufferBtnActive: { backgroundColor: '#D97706', borderColor: '#D97706' },
  bufferText: { fontSize: 11, fontWeight: '800', color: '#B45309' },
  bufferTextActive: { color: '#FFF' },
  audioAlert: { marginLeft: 'auto', fontSize: 12, fontWeight: '800', color: '#047857' },
  alertBanner: { backgroundColor: '#EFF6FF', padding: 10, marginHorizontal: 16, marginTop: 10, borderRadius: 8, borderWidth: 1, borderColor: '#BFDBFE' },
  alertText: { color: '#1E40AF', fontSize: 12, fontWeight: '600' },
  content: { flex: 1, padding: 16 },
  sectionHeader: { fontSize: 16, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  sectionSub: { fontSize: 12, color: '#64748B', marginBottom: 14 },
  catalogItemRow: { backgroundColor: '#FFF', borderRadius: 10, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  catalogName: { fontSize: 14, fontWeight: '800', color: '#1E293B' },
  catalogSub: { fontSize: 12, color: '#64748B', marginTop: 2 },
  stockToggleBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  inStockBtn: { backgroundColor: '#DCFCE7' },
  outOfStockBtn: { backgroundColor: '#FEE2E2' },
  stockToggleText: { fontSize: 12, fontWeight: '800', color: '#0F172A' },
  settleCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 18, borderWidth: 1, borderColor: '#E2E8F0', marginTop: 10 },
  settleRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  settleLabel: { fontSize: 13, color: '#64748B' },
  settleVal: { fontSize: 14, fontWeight: '700', color: '#0F172A' },
  settleDivider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 10 },
  netDisburseLabel: { fontSize: 15, fontWeight: '900', color: '#0F172A' },
  netDisburseVal: { fontSize: 20, fontWeight: '900', color: '#00C853' },
});
