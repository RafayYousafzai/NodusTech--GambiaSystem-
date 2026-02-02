import { CameraView, useCameraPermissions } from 'expo-camera';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Button, StyleSheet, Text, View, Alert, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { verifyTicketSignature, QRPayload } from '../src/services/verification';
import { checkTicketExists, insertTicket, initDatabase } from '../src/services/database';

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const router = useRouter();

  useEffect(() => {
    initDatabase();
  }, []);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="grant permission" />
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
      await insertTicket(payload.data);
      Alert.alert("✅ VALID TICKET", `Amount: ${payload.data.amount} ${payload.data.currency}\nValid & Saved to Ledger.`, [
          { text: "OK", onPress: () => setScanned(false) }
      ]);

    } catch (e) {
      console.error(e);
      Alert.alert("Error", "An unexpected error occurred.", [
        { text: "OK", onPress: () => setScanned(false) }
      ]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen options={{ title: "Scanner", headerShown: false }} />
      <StatusBar style="light" />
      
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
      />

      {/* Overlay to guide user */}
      <View style={styles.overlay}>
        <View style={styles.topOverlay}>
          <Text style={styles.title}>Gambia Transport Validator</Text>
        </View>
        <View style={styles.scannerFrame} />
        <View style={styles.bottomOverlay}>
          <Text style={styles.instruction}>Align QR code within the frame</Text>
          <Button title="View History" onPress={() => router.push('/history')} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
    color: 'white',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topOverlay: {
    position: 'absolute',
    top: 50,
    width: '100%',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 10,
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#00ff00',
    backgroundColor: 'transparent',
    borderRadius: 10,
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 50,
    width: '100%',
    alignItems: 'center',
    gap: 20
  },
  instruction: {
    color: 'white',
    fontSize: 16,
    marginBottom: 20,
  },
});
