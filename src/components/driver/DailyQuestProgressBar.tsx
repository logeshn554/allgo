// Job: Daily incentive quest progress bar showing target trips and bonus reward.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DailyQuestProgress } from '../../data/driverCodEarningsService.ts';

interface Props {
  quest: DailyQuestProgress;
}

export const DailyQuestProgressBar: React.FC<Props> = ({ quest }) => {
  const percent = Math.min(100, Math.round((quest.completedTrips / quest.targetTrips) * 100));

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>🎯 {quest.questTitle}</Text>
          <Text style={styles.sub}>Expires in {quest.expiresInHours} hours</Text>
        </View>
        <View style={styles.rewardBadge}>
          <Text style={styles.rewardText}>+₹{quest.bonusRewardInr} Bonus</Text>
        </View>
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${percent}%` }]} />
      </View>

      <View style={styles.footer}>
        <Text style={styles.progressText}>
          {quest.completedTrips} of {quest.targetTrips} trips completed
        </Text>
        <Text style={styles.remainingText}>
          {quest.targetTrips - quest.completedTrips} trips to unlock bonus
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { backgroundColor: '#F0FDF4', borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#BBF7D0' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 13, fontWeight: '800', color: '#166534' },
  sub: { fontSize: 11, color: '#15803D', marginTop: 1 },
  rewardBadge: { backgroundColor: '#16A34A', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  rewardText: { color: '#FFF', fontWeight: '800', fontSize: 11 },
  track: { height: 8, backgroundColor: '#DCFCE7', borderRadius: 4, marginBottom: 8, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: '#16A34A' },
  footer: { flexDirection: 'row', justifyContent: 'space-between' },
  progressText: { fontSize: 11, fontWeight: '800', color: '#166534' },
  remainingText: { fontSize: 11, color: '#15803D' },
});
