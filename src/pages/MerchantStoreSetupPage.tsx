// Job: 7-Step Store Setup & Compliance Wizard for Merchants (FSSAI, GSTIN, Store Details).

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { updateMerchantStore } from '../data/userRegistrationService.ts';

interface Props {
  phone: string;
  onCompleted: () => void;
}

const STEP_TITLES = [
  'Owner Identification',
  'Store Name & Brand',
  'Store Category',
  'Physical Store Address',
  'FSSAI Food License',
  'GSTIN Tax Registration',
  'Review & Launch Store',
];

export const MerchantStoreSetupPage: React.FC<Props> = ({ phone, onCompleted }) => {
  const [step, setStep] = useState<number>(1);
  const [ownerName, setOwnerName] = useState('');
  const [storeName, setStoreName] = useState('');
  const [category, setCategory] = useState('Supermarket & Grocery');
  const [address, setAddress] = useState('');
  const [fssai, setFssai] = useState('');
  const [gstin, setGstin] = useState('');
  const [error, setError] = useState('');

  const handleNext = () => {
    if (step === 1) {
      if (!ownerName.trim()) return setError('Please enter authorized owner name.');
      setError('');
      return setStep(2);
    }
    if (step === 2) {
      if (!storeName.trim()) return setError('Please enter retail store / outlet name.');
      setError('');
      return setStep(3);
    }
    if (step === 3) {
      if (!category.trim()) return setError('Please select store category.');
      setError('');
      return setStep(4);
    }
    if (step === 4) {
      if (!address.trim()) return setError('Please enter complete physical store address.');
      setError('');
      return setStep(5);
    }
    if (step === 5) {
      if (fssai.trim().length < 10) return setError('Please enter valid 14-digit FSSAI license number.');
      setError('');
      return setStep(6);
    }
    if (step === 6) {
      if (gstin.trim().length < 10) return setError('Please enter valid 15-character GSTIN number.');
      setError('');
      return setStep(7);
    }
    if (step === 7) {
      const res = updateMerchantStore(phone, ownerName, storeName, address, fssai, gstin);
      if (res.success) {
        onCompleted();
      } else {
        setError('Store setup failed. Please retry.');
      }
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>Merchant Store Onboarding</Text>
      <Text style={styles.stepIndicator}>Step {step} of 7: {STEP_TITLES[step - 1]}</Text>

      {step === 1 && (
        <View style={styles.card}>
          <Text style={styles.label}>Owner / Managing Partner Full Name</Text>
          <TextInput style={styles.input} value={ownerName} onChangeText={(v) => { setOwnerName(v); setError(''); }} placeholder="e.g. Ramesh Patel" />
          <Text style={styles.hint}>Must match PAN / Aadhaar records of the registered proprietor.</Text>
        </View>
      )}

      {step === 2 && (
        <View style={styles.card}>
          <Text style={styles.label}>Store / Outlet Commercial Name</Text>
          <TextInput style={styles.input} value={storeName} onChangeText={(v) => { setStoreName(v); setError(''); }} placeholder="e.g. Daily Fresh Supermarket" />
          <Text style={styles.hint}>This name will appear on the customer app storefront.</Text>
        </View>
      )}

      {step === 3 && (
        <View style={styles.card}>
          <Text style={styles.label}>Store Category & Catalog Type</Text>
          <TextInput style={styles.input} value={category} onChangeText={(v) => { setCategory(v); setError(''); }} placeholder="e.g. Supermarket, Bakery, Fresh Produce" />
          <Text style={styles.hint}>Determines product tax tiers and catalog layout presets.</Text>
        </View>
      )}

      {step === 4 && (
        <View style={styles.card}>
          <Text style={styles.label}>Physical Store Address & Geo-Pin</Text>
          <TextInput style={[styles.input, styles.multiline]} value={address} onChangeText={(v) => { setAddress(v); setError(''); }} placeholder="Shop #, Street, City, PIN Code" multiline numberOfLines={3} />
          <Text style={styles.hint}>Used by delivery partners for order pick-ups.</Text>
        </View>
      )}

      {step === 5 && (
        <View style={styles.card}>
          <Text style={styles.label}>FSSAI Food License Number</Text>
          <TextInput style={styles.input} value={fssai} onChangeText={(v) => { setFssai(v); setError(''); }} placeholder="14-digit FSSAI # (e.g. 10020043000123)" keyboardType="number-pad" maxLength={14} />
          <Text style={styles.hint}>Mandatory for selling packaged food or fresh grocery items.</Text>
        </View>
      )}

      {step === 6 && (
        <View style={styles.card}>
          <Text style={styles.label}>GSTIN Tax Identification Number</Text>
          <TextInput style={styles.input} value={gstin} onChangeText={(v) => { setGstin(v.toUpperCase()); setError(''); }} placeholder="15-character GSTIN (e.g. 29ABCDE1234F1Z5)" maxLength={15} autoCapitalize="characters" />
          <Text style={styles.hint}>Required for automated B2B and consumer tax invoicing.</Text>
        </View>
      )}

      {step === 7 && (
        <View style={styles.card}>
          <Text style={styles.summaryTitle}>Store Profile Summary</Text>
          <Text style={styles.row}>Store: <Text style={styles.val}>{storeName}</Text></Text>
          <Text style={styles.row}>Owner: <Text style={styles.val}>{ownerName}</Text></Text>
          <Text style={styles.row}>Category: <Text style={styles.val}>{category}</Text></Text>
          <Text style={styles.row}>Address: <Text style={styles.val}>{address}</Text></Text>
          <Text style={styles.row}>FSSAI: <Text style={styles.val}>{fssai}</Text></Text>
          <Text style={styles.row}>GSTIN: <Text style={styles.val}>{gstin}</Text></Text>
          <Text style={styles.hint}>Ready to accept orders on the AllGo Merchant KDS Console.</Text>
        </View>
      )}

      {Boolean(error) && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={styles.primaryBtn} onPress={handleNext}>
        <Text style={styles.btnText}>{step === 7 ? 'Complete Setup & Open KDS Console →' : 'Next Step →'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { padding: 24, backgroundColor: '#FFFFFF', flexGrow: 1, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  stepIndicator: { fontSize: 13, color: '#D97706', fontWeight: '700', marginTop: 4, marginBottom: 20 },
  card: { padding: 16, backgroundColor: '#FFFBEB', borderRadius: 12, borderWidth: 1, borderColor: '#FDE68A', marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, backgroundColor: '#FFFFFF', marginBottom: 12, fontSize: 14 },
  multiline: { height: 70, textAlignVertical: 'top' },
  hint: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  summaryTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 10 },
  row: { fontSize: 13, color: '#4B5563', marginBottom: 6 },
  val: { fontWeight: '700', color: '#111827' },
  error: { color: '#EF4444', fontSize: 13, fontWeight: '600', marginBottom: 12 },
  primaryBtn: { backgroundColor: '#D97706', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
