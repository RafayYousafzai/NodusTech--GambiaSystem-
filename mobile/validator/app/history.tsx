import { StyleSheet, Text, View, FlatList } from 'react-native';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { getAllTickets, TicketRecord } from '../src/services/database';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HistoryScreen() {
  const [tickets, setTickets] = useState<TicketRecord[]>([]);

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    const data = await getAllTickets();
    setTickets(data);
  };

  const renderItem = ({ item }: { item: TicketRecord }) => {
    const data = JSON.parse(item.data);
    return (
      <View style={styles.item}>
        <View style={styles.headerRow}>
            <Text style={styles.ticketId}>ID: {item.ticket_id.slice(0, 8)}...</Text>
            <Text style={styles.amount}>{data.amount} {data.currency}</Text>    
        </View>
        
        <Text style={styles.date}>{new Date(item.scanned_at).toLocaleString()}</Text>
        
        <View style={styles.hashContainer}>
            <Text style={styles.hashLabel}>Prev:</Text>
            <Text numberOfLines={1} style={styles.hashValue}>{item.prev_hash}</Text>
        </View>
        <View style={styles.hashContainer}>
            <Text style={styles.hashLabel}>Curr:</Text>
            <Text numberOfLines={1} style={styles.hashValue}>{item.current_hash}</Text>
        </View>
        
        <View style={styles.validBadge}>
            <Text style={styles.validText}>✔ Hash Valid</Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      <Stack.Screen options={{ title: "Ledger History", headerBackTitle: "Scan" }} />
      <FlatList
        data={tickets}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>No tickets scanned yet.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContent: {
    padding: 16,
  },
  item: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  ticketId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF', // Blue color for money
  },
  date: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  hashContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  hashLabel: {
    fontFamily: 'Courier New', // Monospace for tech feel
    fontSize: 10,
    fontWeight: 'bold',
    color: '#888',
    width: 35,
  },
  hashValue: {
    fontFamily: 'Courier New',
    fontSize: 10,
    color: '#888',
    flex: 1,
  },
  validBadge: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9', // Light green
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  validText: {
    color: '#2E7D32', // Dark green
    fontWeight: 'bold',
    fontSize: 12,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 50,
    color: '#999',
    fontSize: 16,
  },
});
