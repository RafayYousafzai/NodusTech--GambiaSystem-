import { signTicketData } from '../utils/crypto';
import { randomUUID } from 'crypto';
import QRCode from 'qrcode';

export interface CreateTicketParams {
  amount: number;
  currency?: string;
}

export const generateTicket = async (params: CreateTicketParams) => {
  const { amount, currency = 'GMD' } = params;
  
  const ticketId = randomUUID();
  // Standard expiry: 24 hours from now
  const expiresAt = Math.floor(Date.now() / 1000) + (24 * 60 * 60);

  const ticketData = {
    ticket_id: ticketId,
    amount,
    currency,
    expires_at: expiresAt
  };

  const signedTicket = signTicketData(ticketData);

  // Generate QR Code Data URI
  const qrCodeDataUri = await QRCode.toDataURL(JSON.stringify(signedTicket));

  return {
    ...signedTicket,
    qr_code: qrCodeDataUri
  };
};
