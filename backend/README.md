# 🏫 Hostel Video Call Platform – Backend

Complete production-ready backend for **Student–Parent Video Calling & Management Platform** designed for Residential Schools and Hostels.

## Features Covered

### Super Admin
- School Onboarding
- School ON / OFF
- Student & Parent Management
- Pricing & Call Time control
- Unlimited Call option
- Recharge & Payment oversight
- Call History & Reports

### School
- Add / Edit Students
- Student ON / OFF
- Link Parents via mobile
- Call time & Unlimited settings
- Student Account Recharge (cash collection)
- Call History

### Student App
- Login with Student ID
- Select Parent / Guardian
- One-click Video Call (Agora ready)
- Wallet balance aware
- Call History

### Parent App
- OTP Login via mobile
- Auto-linked to students
- Receive / Accept / Reject calls
- Online Recharge
- Call History

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Auth**: JWT + Role based (superadmin / school / student / parent)
- **Video**: Agora (token generation ready)
- **Payments**: Razorpay placeholder (easy to complete)

## Quick Start

### 1. Prerequisites
- Node.js 18+
- PostgreSQL 14+

### 2. Setup

```bash
# Clone / extract
cd hostel-video-call-backend

# Install dependencies
npm install

# Create .env
cp .env.example .env
# Edit DATABASE_URL, JWT_SECRET, Agora credentials etc.

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed sample data
npm run seed
```

### 3. Run

```bash
# Development
npm run dev

# Production
npm start
```

Server runs at `http://localhost:5000`

## Default Login Credentials (after seed)

| Role         | Identifier                          | Password          |
|--------------|-------------------------------------|-------------------|
| Super Admin  | admin@hostelvideocall.com           | SuperAdmin@123    |
| School       | SCH001                              | School@123        |
| Student      | STU001 (schoolCode: SCH001)         | Student@123       |
| Parent       | 9876501234                          | OTP: 123456       |

## API Overview

### Auth
- `POST /api/auth/superadmin/login`
- `POST /api/auth/school/login`
- `POST /api/auth/student/login`
- `POST /api/auth/parent/request-otp`
- `POST /api/auth/parent/verify-otp`

### Schools (Super Admin)
- `POST   /api/schools`
- `GET    /api/schools`
- `PATCH  /api/schools/:id/status`
- `PATCH  /api/schools/:id/settings`

### Students
- `POST   /api/students`
- `GET    /api/students`
- `GET    /api/students/:id`
- `PUT    /api/students/:id`
- `PATCH  /api/students/:id/status`
- `POST   /api/students/:id/parents`

### Calls
- `POST   /api/calls/initiate`          (Student)
- `POST   /api/calls/:callId/accept`    (Parent)
- `POST   /api/calls/:callId/end`
- `POST   /api/calls/:callId/reject`
- `GET    /api/calls/history`

### Recharge & Wallet
- `POST   /api/recharge/manual`         (School / SuperAdmin)
- `POST   /api/recharge/online/order`   (Parent)
- `POST   /api/recharge/online/confirm`
- `GET    /api/recharge/wallet`

## Project Structure

```
hostel-video-call-backend/
├── prisma/
│   ├── schema.prisma
│   └── seed.js
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── services/          (extendable)
│   ├── utils/
│   └── server.js
├── .env.example
├── package.json
└── README.md
```

## Next Steps for Production

1. Add real Agora credentials + `agora-access-token` package
2. Integrate Razorpay / Cashfree webhooks
3. Add FCM push notifications for incoming calls
4. Add proper OTP SMS gateway (MSG91 / Twilio)
5. Add rate limiting per role & IP
6. Deploy with PM2 / Docker + Nginx
7. Add admin dashboard reports endpoints

## License

MIT – Free to use and modify for commercial projects.
