# HostelConnect – Testing & Quality Assurance Strategy

## 1. Backend Testing Strategy (NestJS)

### Unit Tests
- Location: `backend/src/**/*.spec.ts`
- Coverage Goal: > 85% on business logic components (Rule Engine, Call Timer Deductions, Auth Guards).
- Tools: Jest, `ts-jest`.

### Integration & End-to-End (E2E) Tests
- Location: `backend/test/`
- Verification of database RLS isolation between distinct school tenants.
- Webhook signature validation testing for Razorpay and Stripe.
- Tools: Supertest, Testcontainers (PostgreSQL & Redis).

---

## 2. Frontend & App Testing Strategy

### Web Admin Dashboard (React + TypeScript)
- Component rendering & state tests using React Testing Library & Vitest.
- Visual regression & workflow testing via Playwright.

### Flutter Mobile & Tablet Apps
- Flutter Unit Tests for state management logic (Riverpod / BLoC).
- Flutter Widget tests for Kiosk PIN Pad, Call Countdown Timer, and WebRTC Video viewports.
