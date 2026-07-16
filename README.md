# 🎓 ProctorAI — AI-Based Online Exam Proctoring System

A full-stack AI-powered exam proctoring platform with real-time monitoring, cheating detection, and automatic exam termination after 3 violations.

---

## 📦 Project Structure

```
exam-proctor/
├── backend/          # Node.js + Express + MongoDB API
└── frontend/         # Vite + React (TypeScript) SPA
    └── src/ml/       # AI/ML detection modules
```

---

## 🤖 AI/ML Modules (`frontend/src/ml/`)

| Module | Detection | Trigger |
|--------|-----------|---------|
| `faceDetection.ts` | No face / multiple faces | 3s absence / any extra face |
| `noiseDetection.ts` | Voice / noise (Web Audio API FFT) | 2s sustained noise |
| `headMovement.ts` | Head pose & gaze tracking (68 landmarks) | Yaw >28° or Pitch >22° for 2s |
| `tabSwitch.ts` | Tab/window focus change | Immediate on `visibilitychange` |
| `screenChange.ts` | Fullscreen exit, copy/paste, right-click | Immediate |
| `violationManager.ts` | Central counter → **Auto-submit at 3 violations** | Configurable threshold |
| `index.ts` | Orchestrator — runs 200ms detection loop | — |

---

## 🚀 Setup & Running

### Prerequisites
- Node.js v18+
- MongoDB (local or MongoDB Atlas)

### 1. Backend Setup

```bash
cd backend
npm install

# Copy and edit environment variables
copy .env.example .env
# Edit .env: set your MONGO_URI

npm run dev
# Backend runs on http://localhost:5000
```

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

### 3. Face API Models

The face-api.js models must be placed in `frontend/public/models/`.
Download from: https://github.com/vladmandic/face-api/tree/master/model

Required model folders:
- `tiny_face_detector/`
- `face_landmark_68/`
- `face_recognition/`

---

## 🔑 Default Test Accounts

Register via the UI with:
- **Admin**: role = Admin / Instructor
- **Student**: role = Student

---

## 📋 Features

### Student
- Register + Face Enrollment (for identity verification)
- Join exam with access code
- Take exam with live webcam + AI proctoring
- Real-time violation warnings (1/3 → 2/3 → AUTO-SUBMIT)
- View results and violation log

### Admin
- Create exams with MCQ questions
- Set violation threshold (default: 3)
- Live monitor student grid (real-time via Socket.IO)
- Live alert feed with violation types
- View detailed session reports

### AI Proctoring
- 🤖 Face detection (face-api.js + TensorFlow.js)
- 🔇 Noise detection (Web Audio API)
- 👀 Head movement & gaze tracking
- 🔄 Tab switch detection
- 🖥️ Fullscreen enforcement
- 🚨 Auto-submit after configurable violation count

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite + React + TypeScript |
| Styling | Vanilla CSS (premium dark theme) |
| AI/ML | TensorFlow.js + face-api.js + Web Audio API |
| Real-time | Socket.IO |
| Backend | Node.js + Express |
| Database | MongoDB + Mongoose |
| Auth | JWT (access + refresh tokens) |

---

## 📡 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login |
| PUT | /api/auth/face-enroll | Save face descriptor |
| GET | /api/exams | List exams |
| POST | /api/exams | Create exam (admin) |
| POST | /api/sessions/start | Start exam session |
| PUT | /api/sessions/:id/answer | Save answer |
| POST | /api/sessions/:id/violation | Report violation |
| POST | /api/sessions/:id/submit | Submit exam |
| GET | /api/alerts/stats/overview | Admin dashboard stats |
| GET | /api/sessions/exam/:examId | All attempts for exam |
