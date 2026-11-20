// Job: Unified AllGo Wallet view with instant refund balances, promo cash, and transaction ledger.

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { loadWalletState, topUpWallet, WalletTransaction } from '../data/walletStorage.ts';
import { AppIcon } from './AppIcon.tsx';

interface Props {
  onBack?: () => void;
  onTopUpSuccess?: (newBal: number) => void;
}

export const WalletLedgerView: React.FC<Props> = ({ onBack, onTopUpSuccess }) => {
  const [wallet, setWallet] = useState(() => loadWalletState());

  const handleAddMoney = (inr: number) => {
    const updated = topUpWallet(inr * 100, `UPI Quick Top-up ₹${inr}`);
    setWallet({ ...updated });
    onTopUpSuccess?.(updated.balanceCents);
  };

  const instantRefundsInr = Math.floor(wallet.balanceCents * 0.4) / 100;
  const promoCashInr = Math.floor(wallet.balanceCents * 0.1) / 100;
  const mainBalanceInr = (wallet.balanceCents / 100) - instantRefundsInr - promoCashInr;

  return (
    <View style={styles.container}>
      {onBack && (
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backLink}>← Back</Text>
        </TouchableOpacity>
      )}

      {/* Main Balance Banner */}
      <View style={styles.balanceCard}>
        <View style={styles.headerRow}>
          <AppIcon name="wallet" size={32} />
          <Text style={styles.cardTag}>AllGo Closed-Loop Wallet</Text>
        </View>
        <Text style={styles.balanceText}>₹{(wallet.balanceCents / 100).toFixed(2)}</Text>
        <Text style={styles.subtext}>Available for 1-tap checkout across all verticals</Text>

        {/* Sub-Balances */}
        <View style={styles.subRow}>
          <View style={styles.subCol}>
            <Text style={styles.subLabel}>⚡ Instant Refunds</Text>
            <Text style={styles.subVal}>₹{instantRefundsInr.toFixed(2)}</Text>
          </View>
          <View style={styles.subDivider} />
          <View style={styles.subCol}>
            <Text style={styles.subLabel}>🎁 Promo Cash</Text>
            <Text style={styles.subVal}>₹{promoCashInr.toFixed(2)}</Text>
          </View>
        </View>

        {/* Quick Top-up buttons */}
        <View style={styles.topUpRow}>
          <Text style={styles.topUpLabel}>Quick Add:</Text>
          {[100, 250, 500].map((amt) => (
            <TouchableOpacity key={amt} style={styles.amtBtn} onPress={() => handleAddMoney(amt)}>
              <Text style={styles.amtText}>+₹{amt}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Ledger History */}
      <Text style={styles.ledgerHeader}>Recent Ledger Transactions</Text>
      <ScrollView style={styles.ledgerList}>
        {wallet.transactions.length === 0 ? (
          <Text style={styles.emptyText}>No recent wallet transactions.</Text>
        ) : (
          wallet.transactions.map((tx: WalletTransaction) => {
            const isCredit = tx.type === 'credit';
            return (
              <View key={tx.id} style={styles.txRow}>
                <View style={styles.txInfo}>
                  <Text style={styles.txDesc}>{tx.description}</Text>
                  <Text style={styles.txDate}>{new Date(tx.timestamp).toLocaleString()}</Text>
                </View>
                <Text style={[styles.txAmount, isCredit ? styles.txCredit : styles.txDebit]}>
                  {isCredit ? '+' : '-'}₹{(tx.amountCents / 100).toFixed(0)}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', padding: 16 },
  backLink: { color: '#4F46E5', fontWeight: '700', marginBottom: 10 },
  balanceCard: { backgroundColor: '#1E1B4B', borderRadius: 18, padding: 18, marginBottom: 18 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  cardTag: { color: '#A5B4FC', fontSize: 12, fontWeight: '700', marginLeft: 10 },
  balanceText: { fontSize: 32, fontWeight: '900', color: '#FFFFFF', marginBottom: 4 },
  subtext: { fontSize: 11, color: '#C7D2FE', marginBottom: 16 },
  subRow: { flexDirection: 'row', backgroundColor: '#312E81', borderRadius: 12, padding: 10, marginBottom: 14 },
  subCol: { flex: 1, alignItems: 'center' },
  subDivider: { width: 1, backgroundColor: '#4338CA', marginVertical: 2 },
  subLabel: { fontSize: 10, color: '#E0E7FF', fontWeight: '700', marginBottom: 2 },
  subVal: { fontSize: 14, fontWeight: '800', color: '#34D399' },
  topUpRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topUpLabel: { fontSize: 11, color: '#A5B4FC', fontWeight: '700' },
  amtBtn: { backgroundColor: '#4338CA', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  amtText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  ledgerHeader: { fontSize: 14, fontWeight: '800', color: '#111827', marginBottom: 10 },
  ledgerList: { flex: 1 },
  emptyText: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 20 },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  txInfo: { flex: 1 },
  txDesc: { fontSize: 13, fontWeight: '700', color: '#1F2937' },
  txDate: { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '800' },
  txCredit: { color: '#059669' },
  txDebit: { color: '#DC2626' },
});
