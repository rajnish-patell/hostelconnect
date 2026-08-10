# HostelConnect – Complete System Architecture

## 1. High-Level Architecture Overview

HostelConnect is a cloud-native, multi-tenant SaaS platform designed for boarding schools to facilitate secure, monitored, and auto-disconnected video calls between hostel students and verified parents/guardians.

```
                                  +---------------------------------------+
                                  |            CLIENT LAYER               |
                                  +---------------------------------------+
                                  |                                       |
    +-----------------------------+-----------------------------+         |
    |                             |                             |         |
    v                             v                             v         |
+---------------------+ +--------------------+ +------------------------+ |
| Hostel Tablet App   | | Parent Mobile App  | | Web Admin Dashboard    | |
| (Flutter Kiosk)     | | (Flutter iOS/Android)| (React + Vite + TS)    | |
| PIN/QR/Face Auth    | | OTP/Biometric    | | School & Super Admin | |
+----------+----------+ +---------+----------+ +-----------+------------+ |
           |                      |                      |                |
           +----------------------+----------------------+----------------+
                                  |
                                  v
                  +-------------------------------+
                  |    Load Balancer / Gateway    |
                  |     (NGINX / Cloudflare)      |
                  +---------------+---------------+
                                  |
                                  v
                  +-------------------------------+
                  |  NestJS API Gateway Services  |
                  |  (REST API + WebSockets Gate) |
                  +---------------+---------------+
                                  |
         +------------------------+------------------------+-----------------------+
         |                        |                        |                       |
         v                        v                        v                       v
+------------------+     +------------------+    +-------------------+   +--------------------+
|  PostgreSQL 16   |     |   Redis Cache    |    | LiveKit WebRTC    |   | Razorpay / Stripe  |
|  (Multi-tenant   |     | (Session, Queues,|    |   (Media & SFU    |   | (Payments, Wallet, |
| RLS & DB Pools)  |     |  Rate Limiting)  |    | Dynamic Rooms)    |   | GST & Settlements) |
+------------------+     +------------------+    +-------------------+   +--------------------+
                                                           |
                                                           v
                                                 +-------------------+
                                                 | FCM / OneSignal   |
                                                 | Push & SMS Alerts |
                                                 +-------------------+
```

---

## 2. Multi-Tenant Data Isolation Strategy

Data isolation is paramount since multiple schools operate on the same platform instance.

1. **Discriminator Column Pattern with PostgreSQL RLS**: Every tenant-bound entity contains a `school_id` UUID foreign key indexed for rapid lookup.
2. **NestJS Tenant Middleware & Interceptors**:
   - Authentication tokens (JWT) embed `school_id` and user `role`.
   - Incoming requests automatically populate `TenantContext` request parameter.
   - Database queries automatically apply `WHERE school_id = tenantContext.schoolId`.
3. **Super Admin Bypass**: Super Admin tokens carry global scope `school_id = NULL` with explicit permission checks to view platform-wide metrics.

---

## 3. Video Calling Flow (LiveKit WebRTC Integration)

```
[Hostel Tablet]                  [NestJS API Server]             [LiveKit SFU Server]               [Parent App]
      |                                  |                                 |                             |
      |--- 1. Initiate Call (Child ID) ->|                                 |                             |
      |    Check Rules & Wallet Balance  |                                 |                             |
      |                                  |--- 2. Create LiveKit Room ----->|                             |
      |                                  |<-- 3. Room Token Returned ------|                             |
      |                                  |                                 |                             |
      |<-- 4. Return LiveKit Token & ----|                                 |                             |
      |       Call Session ID            |---------------------------------+---------------------------->|
      |                                  | 5. WebSocket Ringing & Push Alert (Incoming Call)             |
      |                                  |                                 |                             |
      |                                  |                                 |<--- 6. Parent Connects -----|
      |                                  |                                 |     with Room Token         |
      |==== 7. WebRTC Audio/Video Stream Established (Adaptive Bitrate) ===|=============================|
      |                                  |                                 |                             |
      |--- 8. Timer Ticks / Wallet Deduct|                                 |                             |
      |    (Auto Disconnect on Limit) --->|--- 9. Delete Room End Session ->|                             |
      |                                  |                                 |=== 10. WebRTC Closed =======|
```

---

## 4. Payment & Wallet Subsystem Architecture

1. **Recharge Flow**: Parent selects amount -> API initiates Razorpay / Stripe Order -> Parent completes payment via UPI / Card -> Webhook triggers verified wallet credit (`wallets` table update) + Invoice PDF creation.
2. **Call Metering Flow**: Before call start, verify `wallet.balance >= call_rate_per_min`. During active call, backend WebSocket scheduler deducts rate per minute or enforces max call limit set by School Admin. Auto-hangup when balance reaches 0.
3. **Commission Settlement**: School Admin views revenue breakdown:
   - Net Wallet Top-ups
   - Platform Commission %
   - Payable Settlement to School.
