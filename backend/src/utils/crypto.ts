import * as nacl from 'tweetnacl';
import * as naclUtil from 'tweetnacl-util';
import { env } from '../env';

export const signTicketData = <T extends Record<string, any>>(ticketData: T) => {
  // Ensure we sign the exact string representation that the client will verify.
  // Ideally, deterministic serialization (canonical JSON) is safer, 
  // but for this MVP, standard JSON.stringify is usually acceptable if environments match.
  const messageString = JSON.stringify(ticketData);
  const messageBytes = naclUtil.decodeUTF8(messageString);
  
  if (!env.SIGNING_PRIVATE_KEY) {
    throw new Error("Private key not configured");
  }

  const secretKeyBytes = naclUtil.decodeBase64(env.SIGNING_PRIVATE_KEY);

  const signatureBytes = nacl.sign.detached(messageBytes, secretKeyBytes);
  const signature = naclUtil.encodeBase64(signatureBytes);

  return {
    data: ticketData,
    sig: signature
  };
};
