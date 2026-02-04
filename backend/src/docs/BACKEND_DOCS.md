# Backend Implementation Documentation

## The Gambia Transport Validator - Ticket Issuer (Component A)

This document details the backend implementation for the Offline-First Anti-Corruption ticketing system. This component serves as the **"Truth Issuer"** in the key-based trust architecture.

### 1. Architecture & Design Decisions

The backend is built as a lightweight, high-performance API using **Fastify** and **TypeScript**. It follows a "Trust No One" security model where the server holds the private key and issues cryptographic proofs (Ed25519 signatures) that can be verified offline by the mobile app.

#### Why Fastify?

* **Performance:** Significantly lower overhead than Express, essential for rapid transaction processing.
* **Safety:** Built-in schema validation (using **Zod**) ensures only strictly valid data reaches our business logic.
* **Documentation:** Automatic Swagger/OpenAPI generation ensures the API is self-documenting for future mobile developers.

#### Why Ed25519?

* **Speed:** Extremely fast signing and verification logic, optimized for low-end mobile CPUs.
* **Size:** Produces a compact 64-byte signature, keeping the QR code complex-free and scannable by cheap cameras.
* **Security:** Deterministic signatures prevent random number generator attacks (a common flaw in RSA).

### 2. Project Structure

```text
backend/
├── src/
│   ├── routes/          # API Endpoint definitions
│   │   └── tickets.ts   # Main logic: Input Validation -> Signing -> Response
│   ├── services/        # Business Logic (Platform Agnostic)
│   │   └── ticket.service.ts  # Handles UUID, Formatting & QR Generation
│   ├── utils/           # Shared Utilities
│   │   └── crypto.ts    # The cryptographic core (Ed25519 signing wrapper)
│   ├── scripts/         # Admin Utilities
│   │   └── keygen.ts    # One-time script to generate Authority Keys
│   ├── app.ts           # App Factory & Plugin Registration
│   ├── env.ts           # Type-safe Environment Variable Loader
│   └── server.ts        # Entry point
└── package.json

```

### 3. Implementation Details

#### Architectural Decision: Colocated Schemas

For this MVP, we utilized **Inline Route Schemas** with `fastify-type-provider-zod`.
**Reason:** It keeps the **Input Validation**, **Output Serialization**, and **Route Handler** in a single file (`routes/tickets.ts`). This reduces context switching and significantly speeds up development while maintaining strict type safety.

#### The Data Flow

1. **Request:** `POST /tickets/generate` with `{ amount: 100 }`.
2. **Validation:** Fastify+Zod strictly verifies payload types.
3. **Service:** `ticket.service.ts` constructs the canonical ticket object (UUID + Timestamp).
4. **Signing:** `crypto.ts` serializes the JSON and signs it using the **Private Key** (via `tweetnacl`).
4. **Signing:** `crypto.ts` serializes the JSON and signs it using the **Private Key** (via `tweetnacl`).
5. **QR Generation:** Generates a Base64 Data URI from the signed payload using `qrcode`.
6. **Response:** Returns the ticket data, signature, and the renderable QR code image string.

### 4. Sample Output (The QR Payload)

The API returns the following JSON, which the mobile app converts into a QR code:

```json
{
  "data": {
    "ticket_id": "836195c6-...",
    "amount": 50,
    "currency": "GMD",
    "expires_at": 1738743000
  },
  "sig": "d3O...[Base64_String]...9A==",
  "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}

```

### 5. Security Context

* The **Private Key** lives ONLY in this backend's `.env` file and is never exposed to the client.
* The **Public Key** is intended to be embedded into the Mobile App source code.
* The system uses `nacl.sign.detached` to generate the signature, ensuring standard Ed25519 compliance.

### 6. How to Run

1. **Setup Keys:** Run `npm run keygen` to create your Authority Keypair.
2. **Configure:** Add the keys to your `.env` file (see `.env.example`).
3. **Start:** `npm run dev`.
4. **Docs:** Visit `http://localhost:3000/docs` to test endpoints via Swagger UI.
 

 npm run dev
```

**Generate a ticket:**
```bash
curl -X POST http://localhost:3000/tickets/generate \
  -H "Content-Type: application/json" \
  -d '{"amount": 100}'
```

**Expected Response:**
```json
{
  "data": { "ticket_id": "...", "amount": 100, "...": "..." },
  "sig": "..."
}