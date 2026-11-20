// Job: Store Busy-Mode pause toggle, custom peak rush prep buffer controls, and operating hours overview.

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AppIcon } from '../AppIcon.tsx';
import { StoreOperationalSettings } from '../../data/merchantInventoryApi.ts';

interface Props {
  settings: StoreOperationalSettings;
  onToggleBusy: (durationMinutes: number) => void;
  onBufferChange: (mins: number) => void;
}

export const StoreBusyControls: React.FC<Props> = ({
  settings,
  onToggleBusy,
  onBufferChange,
}) => {
  return (
    <View style={styles.container}>
      {/* Busy Mode Toggle */}
      <View style={[styles.section, settings.isBusyMode && styles.sectionBusy]}>
        <View style={styles.row}>
          <AppIcon name={settings.isBusyMode ? 'pause' : 'play'} size={24} />
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>
              Store State: {settings.isBusyMode ? 'PAUSED (Busy Mode)' : 'OPEN & ACCEPTING ORDERS'}
            </Text>
            {settings.isBusyMode && settings.busyUntil && (
              <Text style={styles.busyUntilText}>
                Orders paused until {new Date(settings.busyUntil).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.btnGroup}>
          <TouchableOpacity
            style={[styles.busyBtn, !settings.isBusyMode && styles.busyBtnActive]}
            onPress={() => onToggleBusy(0)}
          >
            <Text style={[styles.btnText, !settings.isBusyMode && styles.btnTextActive]}>
              Normal (Open)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.busyBtn, settings.isBusyMode && settings.busyDurationMinutes === 30 && styles.busyBtnActiveBusy]}
            onPress={() => onToggleBusy(30)}
          >
            <Text style={[styles.btnText, settings.isBusyMode && settings.busyDurationMinutes === 30 && styles.btnTextActive]}>
              Pause 30m
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.busyBtn, settings.isBusyMode && settings.busyDurationMinutes === 60 && styles.busyBtnActiveBusy]}
            onPress={() => onToggleBusy(60)}
          >
            <Text style={[styles.btnText, settings.isBusyMode && settings.busyDurationMinutes === 60 && styles.btnTextActive]}>
              Pause 60m
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Peak Rush Prep Buffer */}
      <View style={styles.section}>
        <View style={styles.row}>
          <AppIcon name="clock" size={24} />
          <View>
            <Text style={styles.sectionTitle}>Peak Rush Preparation Buffer</Text>
            <Text style={styles.sectionSub}>Added to customer ETA during rush hours</Text>
          </View>
        </View>

        <View style={styles.btnGroup}>
          {[0, 10, 20, 30].map((mins) => (
            <TouchableOpacity
              key={mins}
              style={[styles.bufferBtn, settings.prepBufferMinutes === mins && styles.bufferBtnActive]}
              onPress={() => onBufferChange(mins)}
            >
              <Text style={[styles.bufferText, settings.prepBufferMinutes === mins && styles.bufferTextActive]}>
                +{mins}m
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { gap: 12, marginBottom: 14 },
  section: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E2E8F0' },
  sectionBusy: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: '#0F172A' },
  sectionSub: { fontSize: 11, color: '#64748B', marginTop: 1 },
  busyUntilText: { fontSize: 11, color: '#DC2626', fontWeight: '700', marginTop: 2 },
  btnGroup: { flexDirection: 'row', gap: 8 },
  busyBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#F8FAFC', alignItems: 'center' },
  busyBtnActive: { backgroundColor: '#10B981', borderColor: '#10B981' },
  busyBtnActiveBusy: { backgroundColor: '#EF4444', borderColor: '#EF4444' },
  btnText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  btnTextActive: { color: '#FFF' },
  bufferBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', backgroundColor: '#F8FAFC', alignItems: 'center' },
  bufferBtnActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  bufferText: { fontSize: 11, fontWeight: '700', color: '#475569' },
  bufferTextActive: { color: '#FFF' },
});
