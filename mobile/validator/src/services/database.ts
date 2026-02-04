import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { TicketData } from './verification';

const DB_NAME = 'gambia_validator.db';

export interface TicketRecord {
  id: number;
  ticket_id: string;
  data: string; // JSON string of the ticket data
  prev_hash: string;
  current_hash: string;
  scanned_at: string;
}

export interface AuditResult extends TicketRecord {
  isValid: boolean;
  error?: string;
}

// Singleton promise to ensure we only open the DB once
let dbInstance: SQLite.SQLiteDatabase | null = null;
let dbInitPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export const getDB = async (): Promise<SQLite.SQLiteDatabase> => {
  if (dbInstance) return dbInstance;
  
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
    const db = await SQLite.openDatabaseAsync(DB_NAME);
    // WAL mode is critical for concurrent checks
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS ledger (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id TEXT NOT NULL UNIQUE,
        data TEXT NOT NULL,
        prev_hash TEXT NOT NULL,
        current_hash TEXT NOT NULL,
        scanned_at DATETIME NOT NULL
      );
    `);
    dbInstance = db;
    return db;
  })();

  return dbInitPromise;
};

// Kept for backward compatibility if needed, but getDB is preferred
export const initDatabase = async () => {
  await getDB();
};

/**
 * FAST READ: Only for UI rendering. No crypto checks here.
 * Performance First approach.
 */
export const getLedger = async (): Promise<TicketRecord[]> => {
  const db = await getDB();
  return await db.getAllAsync<TicketRecord>('SELECT * FROM ledger ORDER BY id DESC');
};

export const checkTicketExists = async (ticketId: string): Promise<boolean> => {
  const db = await getDB();
  const result = await db.getFirstAsync(
    'SELECT 1 FROM ledger WHERE ticket_id = ?',
    [ticketId]
  );
  return !!result;
};

/**
 * CRITICAL: Atomic Append Operation.
 * Uses strict transaction isolation to prevent hash chain forks.
 */
export const insertTicket = async (ticketData: TicketData): Promise<void> => {
  const db = await getDB();
  
  // Application Layer functionality for integrity
  const dataString = JSON.stringify(ticketData);
  const timestamp = new Date().toISOString(); 

  // Atomic Transaction: Prevents Race Conditions during Hash Calculation
  await db.withTransactionAsync(async () => {
    // 1. Lock & Read Tip
    const result = await db.getFirstAsync<{ current_hash: string }>(
      'SELECT current_hash FROM ledger ORDER BY id DESC LIMIT 1'
    );
    const prevHash = result?.current_hash || 'GENESIS_HASH';

    // 2. Calculate Hash (Application Layer)
    // Rule: SHA256( Ticket_ID + Timestamp + Previous_Row_Hash )
    const contentToHash = `${ticketData.ticket_id}${timestamp}${prevHash}`;
    const currentHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      contentToHash
    );

    // 3. Write
    await db.runAsync(
      'INSERT INTO ledger (ticket_id, data, prev_hash, current_hash, scanned_at) VALUES (?, ?, ?, ?, ?)',
      [ticketData.ticket_id, dataString, prevHash, currentHash, timestamp]
    );
  });
};

/**
 * AUDIT FUNCTION: Heavy crypto verification.
 * Run this in background or on demand. Never in flatlist render.
 */
export const runIntegrityAudit = async (): Promise<AuditResult[]> => {
  const db = await getDB();
  const allTickets = await db.getAllAsync<TicketRecord>('SELECT * FROM ledger ORDER BY id ASC');

  const audited: AuditResult[] = [];

  for (let i = 0; i < allTickets.length; i++) {
    const current = allTickets[i];
    const prev = i > 0 ? allTickets[i - 1] : null;
    let isValid = true;
    let errorType = undefined;

    // 1. Verify Hash Integrity
    const contentToHash = `${current.ticket_id}${current.scanned_at}${current.prev_hash}`;
    const calculatedHash = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        contentToHash
    );

    if (calculatedHash !== current.current_hash) {
        isValid = false;
        errorType = "Data Tampered (Hash Mismatch)";
    }

    // 2. Verify Chain Continuity
    if (prev) {
        if (current.prev_hash !== prev.current_hash) {
            isValid = false;
            errorType = "Chain Broken (Missing Previous Row)";
        }
    } else {
        // Genesis block check: The very first ticket MUST point to GENESIS_HASH.
        // If it doesn't, it means the start of the chain was deleted (e.g. ID 1-10 deleted, ID 11 remains).
        if (current.prev_hash !== 'GENESIS_HASH') {
             isValid = false;
             errorType = "Root Tampered (Genesis Block Missing)";
        }
    }

    audited.push({ ...current, isValid, error: errorType });
  }

  // Return newest first strictly for UI
  return audited.reverse();
};

export const corruptDatabase = async () => {
  const db = await getDB();
  await db.runAsync('DELETE FROM ledger WHERE id = (SELECT id FROM ledger ORDER BY id DESC LIMIT 1 OFFSET 1)');
};
