import { CameraView, useCameraPermissions } from 'expo-camera';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  Alert, 
  Dimensions, 
  TouchableOpacity, 
  Animated,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { verifyTicketSignature, QRPayload } from '../src/services/verification';
import { checkTicketExists, insertTicket, initDatabase } from '../src/services/database';

const { width, height } = Dimensions.get('window');
const SCANNER_SIZE = 280;

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const router = useRouter();
  
  // Animation for the scanning line
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    initDatabase();
    startScanAnimation();
  }, []);

  const startScanAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(scanAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        })
      ])
    ).start();
  };

  if (!permission) {
    return <View style={{ flex: 1, backgroundColor: '#000' }} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <StatusBar style="light" />
        <Ionicons name="camera-outline" size={80} color="#4ade80" style={{ marginBottom: 20 }} />
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionText}>
          We need camera access to scan tickets.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    try {
      // 1. Parse JSON
      let payload: QRPayload;
      try {
        payload = JSON.parse(data);
      } catch {
        Alert.alert("Invalid QR", "This is not a valid ticket QR code.", [
            { text: "OK", onPress: () => setScanned(false) }
        ]);
        return;
      }

      // 2. Crypto Check
      const isValidSig = verifyTicketSignature(payload);
      if (!isValidSig) {
        Alert.alert("⚠️ FAKE TICKET", "Digital Signature verification failed! This ticket is forged.", [
            { text: "OK", onPress: () => setScanned(false) }
        ]);
        return;
      }

      // 3. Duplicate Check
      const isDuplicate = await checkTicketExists(payload.data.ticket_id);
      if (isDuplicate) {
        Alert.alert("❌ ALREADY USED", "This ticket has already been scanned.", [
            { text: "OK", onPress: () => setScanned(false) }
        ]);
        return;
      }

      // 4. Ledger Logic
      try {
        await insertTicket(payload.data);
        Alert.alert("✅ VALID TICKET", `Amount: ${payload.data.amount} ${payload.data.currency}\nValid & Saved to Ledger.`, [
            { text: "OK", onPress: () => setScanned(false) }
        ]);
      } catch (e: any) {
        if (e.message?.includes('UNIQUE constraint failed')) {
           Alert.alert("❌ ALREADY USED", "This ticket has already been scanned.", [
            { text: "OK", onPress: () => setScanned(false) }
          ]);
        } else {
          throw e;
        }
      }

    } catch (e) {
      console.error(e);
      Alert.alert("Error", "An unexpected error occurred.", [
        { text: "OK", onPress: () => setScanned(false) }
      ]);
    }
  };

  const translateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCANNER_SIZE],
  });

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />
      
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
      />

      {/* Dark Overlay with Rounded Cutout */}
      <View style={styles.overlayContainer}>
        <View style={styles.scanHole} />
        
        <View style={styles.scannerGuide}>
             {/* Corner Markers */}
             <View style={[styles.corner, styles.topLeft]} />
             <View style={[styles.corner, styles.topRight]} />
             <View style={[styles.corner, styles.bottomLeft]} />
             <View style={[styles.corner, styles.bottomRight]} />
             
             {/* Scanning Animation Line */}
             <Animated.View 
                style={[
                  styles.scanLine, 
                  { transform: [{ translateY }] }
                ]} 
             />
        </View>
      </View>

      {/* UI Layer */}
      <SafeAreaView style={styles.uiContainer}>
        <View style={styles.header}>
          <View style={styles.badge}>
             <Ionicons name="shield-checkmark" size={16} color="white" />
             <Text style={styles.badgeText}>VALIDATOR</Text>
          </View>
          <Text style={styles.appTitle}>Gambia Transport</Text>
        </View>

        <View style={styles.footer}>
          <Text style={styles.instructionText}>
            Align ticket QR code within the frame
          </Text>
          
          <TouchableOpacity 
            style={styles.historyButton} 
            onPress={() => router.push('/history')}
            activeOpacity={0.8}
          >
            <Ionicons name="time-outline" size={24} color="white" />
            <Text style={styles.historyButtonText}>View History</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginBottom: 12,
  },
  permissionText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 32,
  },
  permissionButton: {
    backgroundColor: '#4ade80',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 16,
  },
  
  // Overlay System
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanHole: {
    width: 4280, // 2000 border * 2 + 280 content
    height: 4280,
    borderWidth: 2000,
    borderColor: 'rgba(0,0,0,0.6)',
    borderRadius: 2035, // 2000 + 35 radius
    position: 'absolute',
    // Centering the giant view
    left: '50%',
    top: '50%',
    marginLeft: -2140,
    marginTop: -2140,
  },
  scannerGuide: {
    width: SCANNER_SIZE,
    height: SCANNER_SIZE,
  },

  // UI Layer
  uiContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: 20,
    pointerEvents: 'box-none',
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 222, 128, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(74, 222, 128, 0.5)',
  },
  badgeText: {
    color: '#4ade80',
    fontWeight: '700',
    fontSize: 12,
    marginLeft: 4,
    letterSpacing: 1,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: 'white',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 20,
    marginBottom: 20,
  },
  instructionText: {
    color: '#ccc',
    fontSize: 15,
    marginBottom: 30,
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#555',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  historyButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },

  // Scanner Markers
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#4ade80',
    borderWidth: 4,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 30,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 30,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 30,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 30,
  },
  scanLine: {
    width: '100%',
    height: 2,
    backgroundColor: 'rgba(74, 222, 128, 0.7)',
    shadowColor: "#4ade80",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    position: 'absolute',
    top: 0,
  }
});
