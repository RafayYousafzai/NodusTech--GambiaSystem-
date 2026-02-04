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
2.  **Mobile:** Add `syncService.ts` to fetch `last_hash` and upload diff.
