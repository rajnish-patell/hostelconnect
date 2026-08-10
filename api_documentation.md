# HostelConnect – API Endpoints & OpenAPI Documentation Summary

Base URL: `https://api.hostelconnect.io/api/v1`

---

## Authentication & Session Management (`/auth`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/student/login` | Public (Tablet) | Login with Student ID + 4-digit PIN |
| `POST` | `/auth/student/qr-login` | Public (Tablet) | Login via QR code scan |
| `POST` | `/auth/parent/send-otp` | Public | Send OTP to mobile phone |
| `POST` | `/auth/parent/verify-otp` | Public | Verify OTP & return JWT Access/Refresh tokens |
| `POST` | `/auth/refresh-token` | Public | Refresh JWT session |
| `POST` | `/auth/logout` | Authenticated | Invalidate current token session |

---

## School & Tenant Administration (`/schools`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/schools` | Super Admin | List all registered schools (paginated) |
| `POST` | `/schools` | Super Admin | Create & onboard a new school |
| `GET` | `/schools/:id` | School Admin | Fetch current school profile & settings |
| `PUT` | `/schools/:id` | School Admin | Update school branding, name, contact info |
| `PATCH` | `/schools/:id/status` | Super Admin | Suspend / Activate school tenant |

---

## Student & Parent Management (`/students`, `/parents`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/students` | School Admin, Warden | List enrolled students |
| `POST` | `/students` | School Admin | Add student profile |
| `POST` | `/students/import-excel` | School Admin | Bulk import students via Excel template |
| `POST` | `/students/:id/reset-pin` | School Admin | Generate new PIN for student |
| `GET` | `/students/:id/parents` | Student, Tablet | List linked registered parents with live status |
| `POST` | `/parents/register` | School Admin | Register & verify parent guardian |
| `POST` | `/parents/link-student` | School Admin | Associate parent to student with access flags |

---

## Hostel Tablet Management (`/tablets`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/tablets` | School Admin | List registered hostel tablet devices |
| `POST` | `/tablets/register` | School Admin | Pair new tablet device with hardware ID |
| `POST` | `/tablets/:id/remote-lock` | School Admin | Remote lockdown / force exit application |
| `POST` | `/tablets/:id/ping` | Tablet Device | Heartbeat & status ping (ONLINE/BUSY) |

---

## Video Calls Subsystem (`/calls`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/calls/initiate` | Student (Tablet) | Initiate call request to linked parent |
| `POST` | `/calls/accept` | Parent | Accept call & receive LiveKit room token |
| `POST` | `/calls/reject` | Parent | Reject call with optional auto-SMS/FCM |
| `POST` | `/calls/end` | Student / Parent | End call and finalize duration/wallet deduction |
| `GET` | `/calls/active` | School Admin | Real-time live call monitoring stats |
| `GET` | `/calls/history` | School Admin, Parent| Query historical call logs with filters |

---

## Payments & Wallet (`/payments`, `/wallet`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/wallet/balance` | Parent | Fetch parent wallet balance |
| `POST` | `/payments/create-order` | Parent | Initiate Razorpay / Stripe top-up order |
| `POST` | `/payments/webhook/razorpay`| Public | Secure Razorpay payment verification webhook |
| `POST` | `/payments/webhook/stripe`  | Public | Secure Stripe payment verification webhook |
| `GET` | `/wallet/invoices` | Parent | Download PDF transaction invoice |
