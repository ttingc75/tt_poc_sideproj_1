import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  BILLING_CYCLES,
  toISODateString,
  validateSubscriptionDraft,
  type BillingCycle,
  type NewSubscription,
} from '../domain/subscription';

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
  const [nextBillingDate, setNextBillingDate] = useState<Date | null>(
    initialValue ? new Date(`${initialValue.nextBillingDate}T00:00:00`) : null
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [category, setCategory] = useState(initialValue?.category ?? '');
  const [notes, setNotes] = useState(initialValue?.notes ?? '');
  const [splitCount, setSplitCount] = useState(
    initialValue ? String(initialValue.splitCount) : '1'
  );
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    if (!nextBillingDate) {
      setError('Pick a next billing date.');
      return;
    }

    const draft = {
      name: name.trim(),
      amount: Number(amount),
      currency: currency.trim().toUpperCase() || 'USD',
      cycle,
      nextBillingDate: toISODateString(nextBillingDate),
      splitCount: Math.round(Number(splitCount)),
    };

    const validationError = validateSubscriptionDraft(draft);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    onSubmit({
      ...draft,
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
        {BILLING_CYCLES.map((c) => (
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
      <Pressable style={styles.input} onPress={() => setShowDatePicker(true)}>
        <Text style={nextBillingDate ? styles.dateText : styles.dateTextPlaceholder}>
          {nextBillingDate ? toISODateString(nextBillingDate) : 'Select a date'}
        </Text>
      </Pressable>
      {showDatePicker && (
        <>
          <DateTimePicker
            value={nextBillingDate ?? new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={(_event, selectedDate) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (selectedDate) {
                setNextBillingDate(selectedDate);
              }
            }}
          />
          {Platform.OS === 'ios' && (
            <Pressable style={styles.doneButton} onPress={() => setShowDatePicker(false)}>
              <Text style={styles.doneButtonText}>Done</Text>
            </Pressable>
          )}
        </>
      )}

      <Text style={styles.label}>Split with (people, including you)</Text>
      <TextInput
        style={styles.input}
        value={splitCount}
        onChangeText={setSplitCount}
        placeholder="1"
        keyboardType="number-pad"
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
  dateText: {
    fontSize: 15,
    color: '#111827',
  },
  dateTextPlaceholder: {
    fontSize: 15,
    color: '#9CA3AF',
  },
  doneButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  doneButtonText: {
    color: '#2563EB',
    fontWeight: '600',
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
