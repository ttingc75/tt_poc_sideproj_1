import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import type { BillingCycle, NewSubscription } from '../domain/subscription';

const CYCLES: BillingCycle[] = ['weekly', 'monthly', 'yearly'];
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

interface Props {
  initialValue?: NewSubscription;
  submitLabel: string;
  onSubmit: (value: NewSubscription) => void;
}

export function SubscriptionForm({ initialValue, submitLabel, onSubmit }: Props) {
  const [name, setName] = useState(initialValue?.name ?? '');
  const [amount, setAmount] = useState(initialValue ? String(initialValue.amount) : '');
  const [currency, setCurrency] = useState(initialValue?.currency ?? 'USD');
  const [cycle, setCycle] = useState<BillingCycle>(initialValue?.cycle ?? 'monthly');
  const [nextBillingDate, setNextBillingDate] = useState(initialValue?.nextBillingDate ?? '');
  const [category, setCategory] = useState(initialValue?.category ?? '');
  const [notes, setNotes] = useState(initialValue?.notes ?? '');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    const parsedAmount = Number(amount);
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Amount must be a positive number.');
      return;
    }
    if (!ISO_DATE_RE.test(nextBillingDate)) {
      setError('Next billing date must be in YYYY-MM-DD format.');
      return;
    }
    setError(null);
    onSubmit({
      name: name.trim(),
      amount: parsedAmount,
      currency: currency.trim() || 'USD',
      cycle,
      nextBillingDate,
      category: category.trim() || null,
      notes: notes.trim() || null,
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Name</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Netflix" />

      <View style={styles.row}>
        <View style={styles.flex1}>
          <Text style={styles.label}>Amount</Text>
          <TextInput
            style={styles.input}
            value={amount}
            onChangeText={setAmount}
            placeholder="15.99"
            keyboardType="decimal-pad"
          />
        </View>
        <View style={styles.currencyField}>
          <Text style={styles.label}>Currency</Text>
          <TextInput
            style={styles.input}
            value={currency}
            onChangeText={setCurrency}
            autoCapitalize="characters"
            maxLength={3}
          />
        </View>
      </View>

      <Text style={styles.label}>Billing cycle</Text>
      <View style={styles.cycleRow}>
        {CYCLES.map((c) => (
          <Pressable
            key={c}
            style={[styles.cyclePill, cycle === c && styles.cyclePillActive]}
            onPress={() => setCycle(c)}
          >
            <Text style={[styles.cyclePillText, cycle === c && styles.cyclePillTextActive]}>
              {c}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Next billing date</Text>
      <TextInput
        style={styles.input}
        value={nextBillingDate}
        onChangeText={setNextBillingDate}
        placeholder="2026-08-01"
      />

      <Text style={styles.label}>Category (optional)</Text>
      <TextInput style={styles.input} value={category} onChangeText={setCategory} placeholder="Entertainment" />

      <Text style={styles.label}>Notes (optional)</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={notes}
        onChangeText={setNotes}
        multiline
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>{submitLabel}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 48,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
  },
  multiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  currencyField: {
    width: 90,
  },
  cycleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cyclePill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cyclePillActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  cyclePillText: {
    color: '#374151',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  cyclePillTextActive: {
    color: '#fff',
  },
  error: {
    color: '#DC2626',
    marginTop: 12,
  },
  submitButton: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
