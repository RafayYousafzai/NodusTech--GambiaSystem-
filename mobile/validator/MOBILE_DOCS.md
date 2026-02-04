# Mobile Validator Implementation Documentation
## The Gambia Transport Validator - Driver App (Component B)

This document details the mobile implementation for the Offline-First Anti-Corruption ticketing system. This component serves as the **"Truth Validator"** and **"Immutable Ledger"** in our architecture.

### 1. The "Trust No One" Architecture

The Validator App is designed to operate in a hostile environment:
*   **No Internet**: It must verify tickets without calling a server.
*   **Untrusted User**: The driver might try to delete trips to steal money.
*   **Adversarial Input**: Passengers might try to show fake QR codes.

To solve this, we use **Ed25519 Cryptography** for verification and a **Hash-Chained SQLite Database** for storage.

### 2. Tech Stack & Decisions

*   **Framework**: **React Native (Expo)** - Rapid development, easy deployment to Android/iOS.
*   **Language**: **TypeScript** - Strict type safety prevents critical runtime errors in the field.
*   **Cryptography**: **TweetNaCl** - The industry standard for Ed25519 in JavaScript. Fast, small, and secure.
*   **Database**: **Expo SQLite** - A full SQL engine running locally on the device.
*   **Camera**: **Expo Camera** - Performance-optimized QR scanning.

### 3. Project Structure

```text
mobile/validator/
├── app/
│   ├── index.tsx          # Screen 1: The Scanner (Main UI)
│   ├── history.tsx        # Screen 2: The Immutable Ledger View
│   └── _layout.tsx        # Navigation Configuration
├── src/
│   ├── constants/
│   │   └── config.ts      # Configuration (Public Keys via EXPO_PUBLIC_)
│   ├── services/
│   │   ├── verification.ts # The "Brain": Crypto verification logic
│   │   └── database.ts     # The "Vault": SQLite + Hash Chain Logic
│   └── ...
```

### 4. Implementation Details

#### A. The Verification Module (`services/verification.ts`)
This is the core security kernel. It runs **offline**.
1.  **Input**: Takes the QR payload `{ data, sig }`.
2.  **Reconstruction**: Re-creates the exact message string `JSON.stringify(data)` that the server signed.
3.  **Math**: Uses `nacl.sign.detached.verify` to check if the `sig` was created by the Private Key corresponding to our hardcoded `SIGNING_PUBLIC_KEY`.
4.  **Result**: Returns `true` (Valid) or `false` (Fake).

**Security Note**: We use `EXPO_PUBLIC_SIGNING_PUBLIC_KEY` to embed the key. This is safe because the **Public Key** can only *verify* signatures, it cannot *forge* them.

#### B. The Immutable Ledger (`services/database.ts`)
We upgraded the ledger logic to strictly enforce integrity and prevent race conditions.

**1. Atomic Transactions (The Guard)**
We perform the *Read Head* -> *Hash* -> *Write Block* operation inside a `db.withTransactionAsync()` block.
**Why?** This locks the database during insertion, preventing race conditions where two rapid scans could read the same "Latest Hash" and fork the chain.

**2. The Audit Pattern (Performance)**
*   **Fast Read**: The UI uses `getLedger()` which only reads text. It loads instantly.
*   **Deep Audit**: Implementation of `runIntegrityAudit()` which recalculates SHA-256 for every row in the background.

*   **The Hash Chain ("Local Blockchain")**:
    Every time a ticket is scanned, we calculate:
    ```typescript
    currentHash = SHA256( TicketID + Timestamp + PreviousRowHash )
    ```
    **Why?** If the driver deletes a row (e.g., ID 5), the `prev_hash` of ID 6 will no longer match the hash of ID 4. The chain breaks. This provides **mathematical proof** of tampering.

#### C. The Scanner User Flow (`app/index.tsx`)
1.  **Scan**: Camera detects QR code data.
2.  **Parse**: Safe JSON parsing avoids app crashes on bad data.
3.  **Crypto Check**: runs `verifyTicketSignature()`. If fail -> Red Alert.
4.  **Double-Spend Check**: Queries SQLite `SELECT 1 FROM ledger WHERE ticket_id = ?`. If exists -> "Already Used" Alert.
5.  **Commit**: Runs `insertTicket()` inside a Transaction. Catches any `UNIQUE constraint` errors that race past step 4.
6.  **Feedback**: Green Success Alert showing the Amount.

### 5. Setup & Configuration

1.  **Environment**: Requires a `.env.local` file with the Public Key:
    ```env
    EXPO_PUBLIC_SIGNING_PUBLIC_KEY=your_base64_key_here
    ```
2.  **Running**:
    ```bash
    npx expo start
    ```
3.  **Testing**:
    *   Scan a valid QR -> Green Check.
    *   Scan the same QR again -> "Already Used".
    *   Scan a modified QR -> "Fake Ticket".

### 6. Future Improvements (Post-MVP)
*   **Sync**: A background job to upload the SQLite ledger to the cloud when internet becomes available.
*   **Driver ID**: Pin the driver's ID to the hash chain.
