// Job: Driver Captain console container delegating to DutyConsolePage, EarningsPage, and KycDocumentStatusPage.

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DutyConsolePage } from './driver/DutyConsolePage.tsx';
import { EarningsPage } from './driver/EarningsPage.tsx';
import { KycDocumentStatusPage } from './driver/KycDocumentStatusPage.tsx';

interface Props {
  activeOrderId?: string | null;
  onBack: () => void;
}

export const DriverJobPage: React.FC<Props> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'duty' | 'earnings' | 'kyc'>('duty');

  return (
    <View style={styles.container}>
      {/* Subsystem Navigation Bar */}
      <View style={styles.topTabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'duty' && styles.tabBtnActive]}
          onPress={() => setActiveTab('duty')}
        >
          <Text style={[styles.tabText, activeTab === 'duty' && styles.tabTextActive]}>
            🧭 Duty & Trips
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'earnings' && styles.tabBtnActive]}
          onPress={() => setActiveTab('earnings')}
        >
          <Text style={[styles.tabText, activeTab === 'earnings' && styles.tabTextActive]}>
            💳 Wallet & CoD
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'kyc' && styles.tabBtnActive]}
          onPress={() => setActiveTab('kyc')}
        >
          <Text style={[styles.tabText, activeTab === 'kyc' && styles.tabTextActive]}>
            📄 KYC Dossier
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Screen Content */}
      <View style={styles.tabContent}>
        {activeTab === 'duty' && <DutyConsolePage onBack={onBack} />}
        {activeTab === 'earnings' && <EarningsPage onBack={onBack} />}
        {activeTab === 'kyc' && <KycDocumentStatusPage onBack={onBack} />}
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
