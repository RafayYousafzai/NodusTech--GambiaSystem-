import { StyleSheet, Text, View, FlatList, Button, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { corruptDatabase, getLedger, runIntegrityAudit, AuditResult } from '../src/services/database';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

export default function HistoryScreen() {
  const [tickets, setTickets] = useState<AuditResult[]>([]);
  const [isAudited, setIsAudited] = useState(false);

  useEffect(() => {
    loadFast();
  }, []);

  // Performance First: Fast fetch without crypto checks
  const loadFast = async () => {
    const rawData = await getLedger();
    // Default to "assumed valid" until audited to keep UI snappy
    const initialView: AuditResult[] = rawData.map(t => ({ ...t, isValid: true }));
    setTickets(initialView);
    setIsAudited(false);
  };

  // Heavy Computation: Explicit user action or background task
  const runAudit = async () => {
    const auditedData = await runIntegrityAudit();
    setTickets(auditedData);
    setIsAudited(true);
  };

  const handleCorrupt = async () => {
    await corruptDatabase();
    Alert.alert("Sabotage Successful", "Row deleted. Run Audit to detect.");
    loadFast(); // Reload raw data showing gap (or not visible yet)
  };

  const renderItem = ({ item }: { item: AuditResult }) => {
    const data = JSON.parse(item.data);
    const date = new Date(item.scanned_at);

    return (
      <View style={[styles.card, !item.isValid && styles.cardInvalid]}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, !item.isValid && styles.iconContainerInvalid]}>
            <Ionicons name={item.isValid ? "bus" : "warning"} size={20} color={item.isValid ? "#4ade80" : "#ef4444"} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.ticketId}>ID: {item.ticket_id.slice(0, 8)}</Text>
            <Text style={styles.date}>{date.toLocaleDateString()} • {date.toLocaleTimeString()}</Text>
          </View>
          <View style={styles.amountBadge}>
            <Text style={styles.amount}>{data.amount} {data.currency}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.hashSection}>
          <View style={styles.hashRow}>
            <Text style={styles.hashLabel}>PREV</Text>
            <Text numberOfLines={1} style={[styles.hashValue, !item.isValid && styles.hashValueInvalid]}>
              {item.prev_hash}
            </Text>
          </View>
          <View style={styles.hashRow}>
            <Text style={styles.hashLabel}>CURR</Text>
            <Text numberOfLines={1} style={styles.hashValue}>{item.current_hash}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          {item.isValid ? (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#4ade80" />
              <Text style={styles.validText}>Cryptographically Verified</Text>
            </View>
          ) : (
            <View style={styles.errorBadge}>
              <Ionicons name="alert-circle" size={14} color="#ef4444" />
              <Text style={styles.errorText}>{item.error || 'Invalid Entry'}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <Stack.Screen
        options={{
          title: "Scan History",
          headerStyle: { backgroundColor: '#000' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          headerBackTitle: "Back",
          headerShadowVisible: false,
        }}
      />
      <StatusBar style="light" />
      <View style={styles.actionButtons}>
        <Button title={isAudited ? "Audit Complete" : "Run Integrity Audit"} color={isAudited ? "#4ade80" : "#007AFF"} onPress={runAudit} disabled={isAudited} />
        <Button title="Corrupt DB" color="#ef4444" onPress={handleCorrupt} />
      </View>

      <FlatList
        data={tickets}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBg}>
              <Ionicons name="documents-outline" size={48} color="#444" />
            </View>
            <Text style={styles.emptyText}>No tickets scanned yet</Text>
            <Text style={styles.emptySubText}>Scan a ticket to see it appear here in the ledger.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 10,
    backgroundColor: '#111',
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#111',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#222',
  },
  cardInvalid: {
    borderColor: '#ef4444',
    backgroundColor: '#1a0505',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconContainerInvalid: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  headerInfo: {
    flex: 1,
  },
  ticketId: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 2,
  },
  date: {
    fontSize: 13,
    color: '#888',
  },
  amountBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4ade80', // Green accent
  },
  divider: {
    height: 1,
    backgroundColor: '#222',
    marginHorizontal: 16,
  },
  hashSection: {
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.2)', // Slightly darker inner section
  },
  hashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  hashLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#555',
    width: 40,
    letterSpacing: 1,
  },
  hashValue: {
    fontFamily: 'Courier', // Monospace
    fontSize: 11,
    color: '#666',
    flex: 1,
  },
  hashValueInvalid: {
    color: '#ef4444',
    fontWeight: 'bold',
  },
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 8,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
  },
  validText: {
    color: '#4ade80',
    fontWeight: '600',
    fontSize: 12,
  },
  errorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
  },
  errorText: {
    color: '#ef4444',
    fontWeight: '600',
    fontSize: 12,
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyIconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#222',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    maxWidth: 250,
    lineHeight: 20,
  },
});
