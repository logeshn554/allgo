// Job: 4-Step KYC Onboarding Wizard for new delivery partners (Vehicle, DL, RC, Bank Details).

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { updateDriverKyc } from '../data/userRegistrationService.ts';

interface Props {
  phone: string;
  onCompleted: () => void;
}

export const PartnerKycWizardPage: React.FC<Props> = ({ phone, onCompleted }) => {
  const [step, setStep] = useState<number>(1);
  const [name, setName] = useState('');
  const [vehicle, setVehicle] = useState('Motorcycle / Scooter');
  const [dlNumber, setDlNumber] = useState('');
  const [rcNumber, setRcNumber] = useState('');
  const [error, setError] = useState('');

  const handleNext = () => {
    if (step === 1) {
      if (!name.trim()) return setError('Please enter your full name as per DL.');
      setError('');
      return setStep(2);
    }
    if (step === 2) {
      if (!dlNumber.trim()) return setError('Please enter your Driving License (DL) number.');
      setError('');
      return setStep(3);
    }
    if (step === 3) {
      if (!rcNumber.trim()) return setError('Please enter your Vehicle Registration (RC) number.');
      setError('');
      return setStep(4);
    }
    if (step === 4) {
      const res = updateDriverKyc(phone, name, dlNumber, rcNumber, vehicle);
      if (res.success) {
        onCompleted();
      } else {
        setError('Submission failed. Please check your details.');
      }
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>Partner KYC Onboarding</Text>
      <Text style={styles.stepIndicator}>Step {step} of 4: {['Personal Details', 'Driving License', 'Vehicle Registration', 'Review & Submit'][step - 1]}</Text>

      {step === 1 && (
        <View style={styles.card}>
          <Text style={styles.label}>Full Name (as per Govt ID)</Text>
          <TextInput style={styles.input} value={name} onChangeText={(v) => { setName(v); setError(''); }} placeholder="e.g. Suresh Kumar" />
          <Text style={styles.label}>Vehicle Type</Text>
          <TextInput style={styles.input} value={vehicle} onChangeText={setVehicle} placeholder="e.g. Bike, Scooter, Auto" />
        </View>
      )}

      {step === 2 && (
        <View style={styles.card}>
          <Text style={styles.label}>Driving License Number (DL)</Text>
          <TextInput style={styles.input} value={dlNumber} onChangeText={(v) => { setDlNumber(v); setError(''); }} placeholder="e.g. TN-07-20220001234" />
          <Text style={styles.hint}>Valid commercial or non-transport license required for parcel/food fleet.</Text>
        </View>
      )}

      {step === 3 && (
        <View style={styles.card}>
          <Text style={styles.label}>Vehicle Registration Certificate (RC)</Text>
          <TextInput style={styles.input} value={rcNumber} onChangeText={(v) => { setRcNumber(v); setError(''); }} placeholder="e.g. TN-07-CW-5678" />
          <Text style={styles.hint}>Ensure vehicle insurance and pollution certificate are up to date.</Text>
        </View>
      )}

      {step === 4 && (
        <View style={styles.card}>
          <Text style={styles.summaryTitle}>Dossier Summary</Text>
          <Text style={styles.row}>Partner Name: <Text style={styles.val}>{name}</Text></Text>
          <Text style={styles.row}>Phone: <Text style={styles.val}>{phone}</Text></Text>
          <Text style={styles.row}>Vehicle: <Text style={styles.val}>{vehicle}</Text></Text>
          <Text style={styles.row}>License: <Text style={styles.val}>{dlNumber}</Text></Text>
          <Text style={styles.row}>RC Number: <Text style={styles.val}>{rcNumber}</Text></Text>
          <Text style={styles.hint}>Upon submission, our automated OCR pipeline will verify document validity.</Text>
        </View>
      )}

      {Boolean(error) && <Text style={styles.error}>{error}</Text>}

      <TouchableOpacity style={styles.primaryBtn} onPress={handleNext}>
        <Text style={styles.btnText}>{step === 4 ? 'Submit KYC & Go to Duty Console →' : 'Next Step →'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: { padding: 24, backgroundColor: '#FFFFFF', flexGrow: 1, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: '#111827' },
  stepIndicator: { fontSize: 13, color: '#4F46E5', fontWeight: '700', marginTop: 4, marginBottom: 20 },
  card: { padding: 16, backgroundColor: '#F9FAFB', borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, backgroundColor: '#FFFFFF', marginBottom: 12, fontSize: 14 },
  hint: { fontSize: 11, color: '#6B7280', marginTop: 4 },
  summaryTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 10 },
  row: { fontSize: 13, color: '#4B5563', marginBottom: 6 },
  val: { fontWeight: '700', color: '#111827' },
  error: { color: '#EF4444', fontSize: 13, fontWeight: '600', marginBottom: 12 },
  primaryBtn: { backgroundColor: '#4F46E5', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
