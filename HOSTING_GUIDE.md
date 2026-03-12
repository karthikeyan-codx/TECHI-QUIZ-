# Technical Quiz Hosting Guide

This project is easiest to host with:

- Backend: Render
- Frontend: Vercel
- Database: Neon PostgreSQL

This guide uses that setup.

## 1. What You Need Before Hosting

- A GitHub account
- A Render account
- A Vercel account
- Your Neon PostgreSQL connection string
- Your admin password

## 2. Push The Project To GitHub

1. Create a new GitHub repository.
2. Upload this full project to that repository.
3. Make sure these folders are included:
   - `backend/`
   - `frontend/`

## 3. Host The Backend On Render

### Create the service

1. Open Render.
2. Click `New +`.
3. Click `Web Service`.
4. Connect your GitHub repository.
5. Select this project repository.

### Render backend settings

Use these values:

- Name: `technical-quiz-backend`
- Root Directory: `backend`
- Runtime: `Python 3`
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### Backend environment variables

Add these in Render:

- `DATABASE_URL` = your Neon connection string
- `ADMIN_PASSWORD` = your admin password
- `SECRET_KEY` = any strong secret string
- `FRONTEND_URL` = your Vercel frontend URL
- `CORS_ORIGINS` = your Vercel frontend URL

Example:

```env
DATABASE_URL=postgresql+asyncpg://username:password@host/dbname?ssl=require
ADMIN_PASSWORD=admin@tq2026
SECRET_KEY=change-this-to-a-random-secret
FRONTEND_URL=https://your-frontend.vercel.app
CORS_ORIGINS=https://your-frontend.vercel.app
```

### Deploy backend

1. Click `Create Web Service`.
2. Wait for deployment to finish.
3. Open the backend URL after deploy.
4. Test these URLs:

```text
https://your-backend.onrender.com/
https://your-backend.onrender.com/health
https://your-backend.onrender.com/docs
```

If backend is working, `/health` should return:

```json
{ "status": "ok" }
```

## 4. Host The Frontend On Vercel

### Create the project

1. Open Vercel.
2. Click `Add New...`.
3. Click `Project`.
4. Import the same GitHub repository.

### Vercel frontend settings

Use these values:

- Framework Preset: `Vite`
- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`

### Frontend environment variables

Add these in Vercel:

- `VITE_API_URL` = `https://your-backend.onrender.com/api`
- `VITE_WS_URL` = `wss://your-backend.onrender.com`

Example:

```env
VITE_API_URL=https://your-backend.onrender.com/api
VITE_WS_URL=wss://your-backend.onrender.com
```

### Deploy frontend

1. Click `Deploy`.
2. Wait for build to finish.
3. Open the Vercel URL.

## 5. Update Backend CORS After Frontend Deploy

After Vercel gives you the final frontend URL:

1. Go back to Render.
2. Open backend service settings.
3. Update:

- `FRONTEND_URL`
- `CORS_ORIGINS`

Use your real frontend URL, for example:

```env
FRONTEND_URL=https://technical-quiz-tq.vercel.app
CORS_ORIGINS=https://technical-quiz-tq.vercel.app
```

4. Save changes.
5. Let Render redeploy the backend.

## 6. Final Test After Hosting

Open your frontend and test this flow:

1. Open the Vercel frontend URL.
2. Click `Host Event`.
3. Enter admin password.
4. Confirm admin dashboard opens.
5. Open `Questions` tab.
6. Click `Seed 60 Questions`.
7. Check question previews load.
8. Open QR tab.
9. Join from another browser or device.
10. Start quiz and confirm live updates work.

## 7. Important Notes

- Render free instances may sleep after inactivity.
- The first backend request after sleep may be slow.
- WebSockets are required for admin/player live quiz updates.
- Make sure `VITE_WS_URL` uses `wss://` in production.
- Make sure your Neon database allows the deployed backend.

## 8. If Admin Login Fails After Hosting

Check these one by one:

1. `VITE_API_URL` points to the correct backend `/api` URL.
2. `VITE_WS_URL` points to the correct backend root URL.
3. `ADMIN_PASSWORD` is set correctly in Render.
4. `CORS_ORIGINS` exactly matches your frontend URL.
5. Backend `/health` works.
6. Backend `/docs` opens.

## 9. Production URLs Example

Example setup:

- Frontend: `https://technical-quiz-tq.vercel.app`
- Backend: `https://technical-quiz-backend.onrender.com`

Frontend env:

```env
VITE_API_URL=https://technical-quiz-backend.onrender.com/api
VITE_WS_URL=wss://technical-quiz-backend.onrender.com
```

Backend env:

```env
FRONTEND_URL=https://technical-quiz-tq.vercel.app
CORS_ORIGINS=https://technical-quiz-tq.vercel.app
```

## 10. Optional Next Improvements Before Public Hosting

- Move image assets to your own storage or CDN
- Add a custom domain
- Add HTTPS-only security settings
- Add backend logging and monitoring
- Add rate limiting for admin routes
