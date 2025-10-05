# IT Panel Admin - Setup Guide

This is the **separate admin panel** for the IT college management system.

## Project Structure

```
/it-panel          → Student-facing application (port 3000)
/it-panel-admin    → Admin panel (port 3001)
```

Both projects share the same Supabase database.

## Setup Instructions

### 1. Environment Variables

Create `.env.local` file in the root directory:

```bash
cp .env.local.example .env.local
```

Update with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Development Server

```bash
npm run dev
```

Admin panel will run on **http://localhost:3001**

### 4. Build for Production

```bash
npm run build
npm start
```

## Available Routes

- `/` - Admin dashboard home
- `/assignments` - Assignment management
- `/bookings` - Seminar booking management
- `/notices` - Notice management
- `/holidays` - Holiday management
- `/fines` - Fine management
- `/history` - Seminar history
- `/registration` - Student registration
- `/database` - Database management
- `/admin/detect-assignments` - Assignment detection

## API Routes

All API routes from the main project are available:
- `/api/assignments/*`
- `/api/notices/*`
- `/api/seminar/*`
- `/api/cod/*`
- `/api/holidays/*`
- `/api/fines/*`
- etc.

## Key Features

✅ Separate deployment from student app
✅ Full admin functionality
✅ Shared Supabase database
✅ Independent scaling
✅ Better security isolation

## Deployment

### Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Set environment variables
4. Deploy

### Custom Server

```bash
npm run build
npm start
```

## Database

Both projects use the same Supabase database. Run migrations once from either project.

## Notes

- Admin panel runs on port 3001 by default
- Student app runs on port 3000
- Both can run simultaneously for development
- Authentication is shared via Supabase
