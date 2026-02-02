import * as nacl from 'tweetnacl';
import * as naclUtil from 'tweetnacl-util';
import { CONFIG } from '../constants/config';

export interface TicketData {
  ticket_id: string;
  amount: number;
  currency: string;
  expires_at: number;
}

export interface QRPayload {
  data: TicketData;
  sig: string;
}

export const verifyTicketSignature = (payload: QRPayload): boolean => {
  try {
    const { data, sig } = payload;
    
    // 1. Reconstruct the message exactly as the backend signed it
    const messageString = JSON.stringify(data);
    const messageBytes = naclUtil.decodeUTF8(messageString);
    
    // 2. Decode the signature
    const signatureBytes = naclUtil.decodeBase64(sig);
    
    // 3. Decode the public key
    const publicKeyBytes = naclUtil.decodeBase64(CONFIG.SIGNING_PUBLIC_KEY);
    
    // 4. Verify
    return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
  } catch (e) {
    console.error("Verification failed:", e);
    return false;
  }
};
