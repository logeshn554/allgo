// Job: Driver transparent earnings dashboard, CoD float limit tracker, daily quest, and instant UPI payout.

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import {
  loadDriverFinancials,
  settleCodFloatViaUpi,
  requestInstantDriverPayout,
  DriverFinancialProfile,
} from '../../data/driverCodEarningsService.ts';
import { CodFloatLimitCard } from '../../components/driver/CodFloatLimitCard.tsx';
import { DailyQuestProgressBar } from '../../components/driver/DailyQuestProgressBar.tsx';
import { TripEarningsBreakdownCard } from '../../components/driver/TripEarningsBreakdownCard.tsx';

interface Props {
  onBack: () => void;
}

export const EarningsPage: React.FC<Props> = ({ onBack }) => {
  const [profile, setProfile] = useState<DriverFinancialProfile>(() => loadDriverFinancials());
  const [upiVpa, setUpiVpa] = useState('driver@okaxis');
  const [withdrawAmount, setWithdrawAmount] = useState('1000');
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSettleUpi = async () => {
    const res = await settleCodFloatViaUpi(profile.currentCodFloatInr);
    setProfile(loadDriverFinancials());
    setFeedback(res.message);
  };

  const handleRequestPayout = async () => {
    const amount = parseInt(withdrawAmount, 10) || 0;
    const res = await requestInstantDriverPayout(amount, upiVpa);
    setFeedback(res.message);
    if (res.success) {
      setProfile(loadDriverFinancials());
    }
  };

  return (
    <ScrollView style={styles.screen}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.backLink}>← Return to Console</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Earnings, CoD Float & Payouts</Text>
      </View>

      {feedback && (
        <View style={styles.alertBanner}>
          <Text style={styles.alertText}>{feedback}</Text>
        </View>
      )}

      {/* Available Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Available for Instant UPI Withdrawal</Text>
        <Text style={styles.balanceVal}>₹{profile.walletBalanceInr}</Text>

        <View style={styles.payoutInputRow}>
          <TextInput
            style={styles.vpaInput}
            value={upiVpa}
            onChangeText={setUpiVpa}
            placeholder="UPI VPA (e.g. name@okhdfc)"
          />
          <TouchableOpacity style={styles.payoutBtn} onPress={handleRequestPayout}>
            <Text style={styles.payoutBtnText}>Withdraw</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* CoD Float Limit Card */}
      <CodFloatLimitCard
        currentFloatInr={profile.currentCodFloatInr}
        isBlocked={profile.isCashOrderBlocked}
        onSettleUpi={handleSettleUpi}
      />

      {/* Daily Incentive Quest */}
      <DailyQuestProgressBar quest={profile.quest} />

      {/* Recent Trips Breakdown */}
      <Text style={styles.sectionTitle}>Recent Completed Trips & Payouts</Text>
      {profile.recentTrips.map((trip) => (
        <TripEarningsBreakdownCard key={trip.tripId} trip={trip} />
      ))}

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F8FAFC', padding: 16 },
  topBar: { marginBottom: 12 },
  backLink: { color: '#6200EA', fontWeight: '800', fontSize: 13, marginBottom: 4 },
  title: { fontSize: 18, fontWeight: '900', color: '#0F172A' },
  alertBanner: { backgroundColor: '#EFF6FF', borderRadius: 8, padding: 10, marginBottom: 14, borderWidth: 1, borderColor: '#BFDBFE' },
  alertText: { color: '#1E40AF', fontSize: 12, fontWeight: '700' },
  balanceCard: { backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  balanceLabel: { fontSize: 12, color: '#64748B', fontWeight: '700' },
  balanceVal: { fontSize: 32, fontWeight: '900', color: '#16A34A', marginVertical: 4 },
  payoutInputRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  vpaInput: { flex: 2, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, paddingHorizontal: 10, fontSize: 12 },
  payoutBtn: { flex: 1, backgroundColor: '#10B981', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  payoutBtnText: { color: '#FFF', fontWeight: '800', fontSize: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#0F172A', marginBottom: 10 },
});
