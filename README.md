# 🏫 Hostel Video Call Platform – Full Stack

Complete **Frontend + Backend** for the Student–Parent Video Calling Platform for Residential Schools & Hostels.

---

## 📦 What's Included

### Backend (`/backend`)
- Node.js + Express + Prisma + PostgreSQL
- Full role-based APIs (Super Admin, School, Student, Parent)
- Video call session management (Agora ready)
- Wallet & Recharge system
- JWT authentication + OTP for parents
- Seed data with demo accounts

### Frontend (`/frontend`)
- React + Vite + Tailwind CSS
- Beautiful Login page (Super Admin / School / Parent)
- Super Admin Dashboard
  - View & create Schools
  - Toggle School ON/OFF
  - View all Students
- School Dashboard
  - Add Students + auto-link Parents
  - Toggle Student ON/OFF
  - Call History
  - Manual Recharge

> **Note**: Student & Parent mobile apps (Flutter/React Native) are recommended for the actual video calling UI. This web frontend is for Admin & School management.

---

## 🚀 Quick Start

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit DATABASE_URL and JWT_SECRET

npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev
```

Backend runs at → **http://localhost:5000**

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at → **http://localhost:3000**

---

## 🔑 Demo Credentials

| Role         | Login                          | Password / OTP     |
|--------------|--------------------------------|--------------------|
| Super Admin  | admin@hostelvideocall.com      | SuperAdmin@123     |
| School       | SCH001                         | School@123         |
| Parent       | 9876501234 / patelrajnish47@gmail.com | Email / SMS OTP    |

| Student      | STU001 (schoolCode SCH001)     | Student@123        |

---

## 📁 Project Structure

```
hostel-video-call-fullstack/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.js
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── utils/
│   │   └── server.js
│   ├── package.json
│   └── README.md
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── SuperAdminDashboard.jsx
│   │   │   └── SchoolDashboard.jsx
│   │   ├── api.js
│   │   └── App.jsx
│   ├── package.json
│   └── ...
└── README.md
```

---

## 🛠 Next Steps (Production)

1. Add real **Agora** credentials for video calls
2. Integrate **Razorpay / Cashfree** for parent online recharge
3. Build **Flutter / React Native** apps for Student & Parent
4. Add FCM push notifications for incoming calls
5. Deploy Backend (Render / Railway / VPS) + Frontend (Vercel / Netlify)
6. Use Docker Compose for easy local development

---

## License

MIT – Free to use for commercial projects.
