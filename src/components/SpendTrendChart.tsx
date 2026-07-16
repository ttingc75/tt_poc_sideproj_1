import { StyleSheet, Text, View } from 'react-native';

import type { MonthlySpendPoint } from '../domain/subscription';

interface Props {
  points: MonthlySpendPoint[];
}

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

function monthLabel(month: string): string {
  const [, monthNum] = month.split('-');
  return MONTH_LABELS[Number(monthNum) - 1] ?? month;
}

export function SpendTrendChart({ points }: Props) {
  const max = Math.max(...points.map((p) => p.totalMonthlySpend), 0);

  return (
    <View style={styles.row}>
      {points.map((point) => (
        <View key={point.month} style={styles.column}>
          <Text style={styles.value}>{point.totalMonthlySpend > 0 ? point.totalMonthlySpend.toFixed(0) : ''}</Text>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.bar,
                { height: max > 0 ? `${Math.max((point.totalMonthlySpend / max) * 100, point.totalMonthlySpend > 0 ? 4 : 0)}%` : '0%' },
              ]}
            />
          </View>
          <Text style={styles.label}>{monthLabel(point.month)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 140,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  value: {
    fontSize: 10,
    color: '#6B7280',
    marginBottom: 4,
  },
  barTrack: {
    width: 18,
    height: 90,
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderRadius: 4,
    backgroundColor: '#2563EB',
    minHeight: 0,
  },
  label: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 6,
  },
});
