# Event Management System - Frontend

React-based frontend for the Event Management System with three role-based dashboards.

## Features

- ✅ Role-based routing (Student/Volunteer/Admin)
- ✅ JWT authentication with auto-refresh
- ✅ QR code generation and display
- ✅ Real-time status updates
- ✅ Responsive design (Tailwind CSS)
- ✅ Toast notifications
- ✅ React Query for data fetching

## Tech Stack

- **React 18** - UI library
- **Vite** - Build tool
- **React Router v6** - Routing
- **TanStack Query** - Data fetching
- **Axios** - HTTP client
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **React Hook Form** - Form handling
- **React Hot Toast** - Notifications

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Update the API URL if needed:

```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Start Development Server

```bash
npm run dev
```

Frontend runs on `http://localhost:3000`

## Project Structure

```
src/
├── components/        # Reusable components
├── context/          # React Context (Auth)
├── pages/            # Page components
│   ├── Admin/        # Admin dashboard pages
│   ├── Student/      # Student dashboard pages
│   ├── Volunteer/    # Volunteer dashboard pages
│   ├── Login.jsx     # Login page
│   └── NotFound.jsx  # 404 page
├── services/         # API services
│   └── api.js        # Axios instance & API calls
├── App.jsx           # Main app component
├── main.jsx          # Entry point
└── index.css         # Global styles
```

## Available Routes

### Public Routes
- `/login` - Login page

### Student Routes (role: student)
- `/student` - Student home/status
- `/student/qr` - Student QR code
- `/student/voting` - Voting interface
- `/student/feedback` - Feedback interface
- `/student/attendance` - Attendance history

### Volunteer Routes (role: volunteer)
- `/volunteer` - Volunteer dashboard with QR scanner

### Admin Routes (role: admin)
- `/admin` - Admin overview
- `/admin/events` - Events management
- `/admin/stalls` - Stalls management
- `/admin/users` - Users management
- `/admin/analytics` - Analytics & reports

## Key Features

### Authentication
- Auto-login on page refresh
- Token refresh on expiry
- Redirect based on user role
- Logout from any page

### Student Features
- Generate and download event QR code
- View check-in status in real-time
- Track votes cast (out of 3)
- View feedback given
- See attendance history

### Volunteer Features
- QR scanner for student check-in/out
- View recent scans
- Gate-specific assignment

### Admin Features
- Dashboard overview with stats
- Manage events, stalls, and users
- View analytics
- Export reports

## Customization

### Colors (Tailwind)

Edit `tailwind.config.js` to change color scheme:

```js
theme: {
  extend: {
    colors: {
      primary: { ... }
    }
  }
}
```

### API Endpoint

Update `VITE_API_URL` in `.env`:

```env
VITE_API_URL=https://your-api-domain.com/api
```

## Build for Production

```bash
npm run build
```

Output will be in `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## Deployment

### Vercel

```bash
npm install -g vercel
vercel
```

### Netlify

```bash
npm run build
# Upload dist/ folder
```

### Environment Variables

Remember to set `VITE_API_URL` in your hosting platform's environment variables.

## Development Notes

### QR Scanner Integration

The QR scanner feature requires:
1. Camera permissions
2. `react-qr-reader` or similar library
3. HTTPS in production (camera API requirement)

### State Management

- Global state: React Context (Auth)
- Server state: TanStack Query
- Form state: React Hook Form (when needed)

### API Calls

All API calls are centralized in `src/services/api.js`. Example:

```js
import { studentApi } from '@/services/api';

const { data } = await studentApi.getStatus(eventId);
```

## Troubleshooting

**Blank page on load:**
- Check browser console for errors
- Verify backend is running
- Check CORS settings on backend

**Login fails:**
- Verify API URL in `.env`
- Check backend logs
- Confirm default credentials

**QR code not displaying:**
- Ensure event is active
- Check network tab for API errors
- Verify student is enrolled in event

## License

MIT
