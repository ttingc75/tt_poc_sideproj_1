import { StyleSheet, Text, View } from 'react-native';

interface Props {
  monthlyTotal: number;
  yearlyTotal: number;
}

export function SummaryHeader({ monthlyTotal, yearlyTotal }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.stat}>
        <Text style={styles.value}>{monthlyTotal.toFixed(2)}</Text>
        <Text style={styles.label}>per month</Text>
      </View>
      <View style={styles.divider} />
      <View style={styles.stat}>
        <Text style={styles.value}>{yearlyTotal.toFixed(2)}</Text>
        <Text style={styles.label}>per year</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderRadius: 16,
    paddingVertical: 20,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    backgroundColor: '#374151',
  },
  value: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
  },
  label: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 4,
  },
});
