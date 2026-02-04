# Offline-First Sync Strategy ("The Zipper")

To sync the immutable ledger to the server while keeping it secure and simple, we recommend the **"Zipper Pattern"**.

## 1. The Concept
The Server acts as the "Master Chain". The Phone pushes new links to the server. The server verifies that the *new* links fit perfectly onto the *old* links using the cryptographic hashes.

## 2. The Protocol

### Step A: The Handshake
1.  **Phone:** "I want to sync."
2.  **Server:** "My latest record for you is `Current_Hash: abc...123` (or 'GENESIS_HASH' if new)."

### Step B: The Batch Upload
1.  **Phone:** Looks up its local database.
    ```sql
    SELECT * FROM ledger WHERE prev_hash = 'abc...123' ORDER BY id ASC
    ```
    *This effectively selects all new records that naturally follow the server's state.*
2.  **Phone:** Sends this batch of tickets to the Server.

### Step C: Server Verification (The "Zipper")
The Server runs the **exact same math** as the phone:
1.  Take the first uploaded ticket.
2.  Check: Does its `prev_hash` match my `last_known_hash`?
3.  Check: `SHA256(id + ts + prev)` == `current_hash`?
4.  Check: Is the `Ed25519 Signature` valid (was it issued by us)?
5.  **If all pass**: Save to Server DB. Update `last_known_hash`.
6.  Repeat for the next ticket.

## 3. Handling "Remote Wipe"
If the phone has deleted data (tampering), the "Zipper" won't close.
*   **Server:** "I have hash `abc`. You sent me a ticket with prev_hash `xyz`. This does not match. **SYNC REJECTED.**"
*   **Result:** The driver cannot upload new trips until they explain the missing data. The system fails secure.

## 4. Implementation Plan (Post-MVP)
1.  **Backend:** Add `POST /sync` endpoint accepting `TicketRecord[]`.
## 5. The Reinstall / Clear Data Edge Case

**The Problem:**
If a driver clears app data (or reinstalls), the local DB is empty. The next scan (Trip #51) would mistakenly use `GENESIS_HASH`, creating a fork that the server would reject (because the server expects it to link to Trip #50).

**The Solution: "Checkpoint Hydration"**
When the driver logs into a fresh app installation, the app must perform a **One-Time Checkpoint Fetch**.

### The Flow:
1.  **Login**: Driver signs into the app (Internet required for initial setup).
2.  **Fetch Checkpoint**: App requests `GET /driver/me/latest-hash`.
3.  **Server Responds**: "Your last synced hash was `abc...123` (Trip #50)."
4.  **Mobile Initializes**: The app stores `{ id: 50, current_hash: 'abc...123' }` as a **"Ghost Record"** in the DB.
5.  **Scan #51**:
    *   The app sees the Ghost Record #50.
    *   It calculates Trip #51 using `prev_hash = 'abc...123'`.
6.  **Sync**: The server accepts Trip #51 because it links perfectly to the server's history.

*Note: This strictly distinguishes between "Malicious Deletion" (Offline Gap) and "Authorized Reinstall" (Online Handshake).*
