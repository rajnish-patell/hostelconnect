# HostelConnect – Security & Compliance Checklist

## 1. Authentication & Session Security
- [x] **JWT Hardening**: Access tokens expire in 15 minutes; Refresh tokens use HTTP-only secure cookies with rotation.
- [x] **Password & PIN Hashing**: All passwords use Argon2id / bcrypt with salt factor >= 12; Student PINs hashed before storing.
- [x] **Device Binding**: Parent mobile sessions locked to unique device UUIDs; Tablet devices bound to MAC/Android Device ID.
- [x] **Rate Limiting**: NestJS `@nestjs/throttler` enforces 10 req/min for auth endpoints and 60 req/min for standard APIs.

## 2. Multi-Tenant Isolation & Data Protection
- [x] **PostgreSQL RLS**: Row-Level Security policies active on all tenant-sensitive tables (`students`, `parents`, `calls`, `wallets`).
- [x] **Encrypted Database Fields**: Sensitive data (Parent ID Proof numbers, PIN hashes, Face vector data) encrypted using AES-256-GCM.
- [x] **Media Stream Encryption**: WebRTC video/audio traffic encrypted in transit using DTLS-SRTP via LiveKit.

## 3. Web & Tablet Application Security
- [x] **Kiosk Mode lockdown**: Tablet application leverages Android `Activity.startLockTask()` to prohibit app switching.
- [x] **XSS & Content Security Policy (CSP)**: React Web dashboard headers configured via Helmet (strict CSP, frame-ancestors 'none').
- [x] **CSRF Protection**: SameSite=Strict cookies enforced across dashboard and REST endpoints.
- [x] **SQL Injection Prevention**: Prisma ORM parameterized SQL queries prohibit string concatenation.

## 4. Audit & Compliance
- [x] **Tamper-Evident Audit Logging**: Every critical action (PIN resets, parent links, remote tablet locks, wallet top-ups) logged with timestamp, user ID, IP address, and payload hash.
- [x] **GDPR / DPDP Compliance**: Right to forget mechanism for parent contact data; explicit parent consent recording.
