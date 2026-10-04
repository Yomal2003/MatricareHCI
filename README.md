# MatriCare — React Native (Expo Go) + Node.js

matricare-native/
├── frontend/   Expo React Native app
└── backend/    Node.js + Express API

## Backend (Node.js + Express + MongoDB)
cd backend
npm install
# open backend/.env and paste your connection string into MONGODB_URI=
npm run seed                               # loads demo users + data (clears collections!)
npm run dev                                # http://0.0.0.0:4000  (npm start for production)

Demo staff logins (password: password123): PHM001, NUR001, MOH001
Mother login: phone 0771234567 + OTP from DEV_OTP in .env

API overview (all except /auth and /health need `Authorization: Bearer <token>`):
  POST /auth/login            { staffId, password }  or demo { role }
  POST /auth/otp/request|verify   mother phone login
  GET  /me/summary | /me/appointments | /me/records      (mother)
  GET|POST|PATCH|DELETE /me/family                        (mother consent)
  GET|POST|PATCH /mothers, GET|POST /children             (staff)
  POST /records/batch | /records/visits | /records/immunizations
  GET|POST|PATCH /appointments, /queue, GET|PATCH /alerts
  GET  /reports/summary | /compliance-by-area | /missed | /generate, POST /reports/export  (MOH)
  GET|POST|PATCH /users                                   (MOH)

## Frontend
cd frontend
npm install
npx expo install --fix                     # align native deps with your Expo SDK
# set expo.extra.apiUrl in frontend/app.json to your PC's LAN IP, e.g. http://192.168.1.10:4000
npx expo start                             # scan QR with Expo Go

Phone and PC must be on the same Wi-Fi. If the backend is unreachable the app falls back to demo data,
and entries are queued offline (AsyncStorage) and synced via POST /records/batch when back online.
