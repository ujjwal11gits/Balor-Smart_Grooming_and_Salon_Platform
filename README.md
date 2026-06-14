# Balor: Smart Grooming & Salon Platform

A complete salon booking web application with four roles: **Customer**, **Shop Owner**, **Barber**, and **Admin**.

> This guide is written for **Windows** users only.

---

## What You Need to Install First

Before doing anything, install these three things on your laptop:

### 1. Node.js
Download and install from: **https://nodejs.org**

- Click the **LTS** version (recommended)
- Run the `.msi` installer and click Next through all steps
- Make sure the checkbox **"Add to PATH"** is ticked during install

After installing, open **Command Prompt** and verify:
```cmd
node --version
npm --version
```
Both should print a version number like `v20.x.x`.

---

### 2. MongoDB Community Server
Download from: **https://www.mongodb.com/try/download/community**

- Select **Windows**, package **msi**, then click Download
- Run the installer
- On the setup type screen, choose **Complete**
- Make sure **"Install MongoDB as a Service"** is checked — this makes MongoDB start automatically with Windows
- Finish the installer

After installing, verify in Command Prompt:
```cmd
mongod --version
```

---

### 3. Git (Optional — only needed to clone)
Download from: **https://git-scm.com/download/win**

- Run the installer with all default settings
- After install, you can use **Git Bash** or **Command Prompt** for git commands

---

## Step 1 — Get the Project on Your Laptop

**Option A — Using Git (if installed):**

Open Command Prompt and run:
```cmd
git clone <your-repo-url>
cd Balor-Smart_Grooming_and_Salon_Platform
```

**Option B — Without Git:**

- Download the project as a ZIP file
- Right-click the ZIP → **Extract All**
- Open the extracted `Balor-Smart_Grooming_and_Salon_Platform` folder

---

## Step 2 — Open Command Prompt in the Project Folder

1. Open **File Explorer** and navigate to the `Balor-Smart_Grooming_and_Salon_Platform` folder
2. Click on the address bar at the top of File Explorer
3. Type `cmd` and press **Enter**

This opens Command Prompt directly inside the `Balor-Smart_Grooming_and_Salon_Platform` folder.

---

## Step 3 — Install Dependencies

You need to install packages for both the backend and frontend. Run these commands one by one:

```cmd
cd backend
npm install
```

Wait for it to finish (may take 1–2 minutes), then:

```cmd
cd ..\frontend
npm install
```

Wait again. When both are done you will see something like `added 90 packages`.

---

## Step 4 — Check the Backend Config File

The backend has a config file at `backend\.env`. This file is already created with correct defaults — **you do not need to change anything** to get started.

To view it, open File Explorer, go into the `backend` folder, and open `.env` with Notepad.

It looks like this:
```
PORT=5000
MONGO_URI=mongodb+srv://...your-atlas-uri...
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_REFRESH_SECRET=your_refresh_secret_change_in_production
FRONTEND_URL=http://localhost:5173
```

Leave it as is for now.

> **Email (Required for Registration OTP):** The app uses an OTP email verification flow during registration. By default, it uses Ethereal (a free test service) and prints the OTP link in the console. If you want to use real emails (e.g. Gmail), add these lines to `.env`:
> ```
> SMTP_HOST=smtp.gmail.com
> SMTP_PORT=587
> SMTP_USER=your@gmail.com
> SMTP_PASS=your_gmail_app_password
> ```

---

## Step 5 — Make Sure MongoDB is Running

MongoDB was installed as a Windows Service so it should start automatically. To check:

1. Press **Win + R**, type `services.msc`, press Enter
2. Scroll down and find **MongoDB**
3. The Status column should say **Running**

If it says Stopped:
- Right-click **MongoDB** → click **Start**

Or open **Command Prompt as Administrator** (right-click Command Prompt → Run as administrator) and run:
```cmd
net start MongoDB
```

To verify MongoDB is working, open a new Command Prompt and type:
```cmd
mongosh
```
You should see a MongoDB shell prompt. Type `exit` to close it.

---

## Step 6 — Start the Backend Server

Open **Command Prompt** in the `Balor-Smart_Grooming_and_Salon_Platform` folder and run:

```cmd
cd backend
npm start
```

You should see:
```
MongoDB connected
Server running on port 5000
```

**Leave this window open.** The backend API runs on `http://localhost:5000`.

> To get auto-reload when you edit backend files (useful during development), use `npm run dev` instead.

---

## Step 7 — Start the Frontend

Open a **second Command Prompt** window in the `Balor-Smart_Grooming_and_Salon_Platform` folder and run:

```cmd
cd frontend
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in 300ms

  ➜  Local:   http://localhost:5173/
```

**Leave this window open too.**

---

## Step 8 — Open the App in Your Browser

Open **Google Chrome** or **Microsoft Edge** and go to:

```
http://localhost:5173
```

You will be taken to the login page automatically.

---

## Login Credentials

Use these with accounts you create in the app, or with any admin/barber/shop accounts already present in your database:

| Role | Email | Password | What they can do |
|---|---|---|---|
| **Admin** | your admin account | your password | Manage shop owners, salons, bookings, view analytics |
| **Shop Owner**| Register yourself | your choice | Manage their own salon, add services and prices, manage barbers |
| **Barber** | your barber account | your password | View bookings, confirm/cancel, set availability |
| **Customer** | Register yourself | your choice | Browse salons, book appointments, leave reviews |

To create a customer or shop owner account: click **Register** on the login page, fill in your details, and complete the **OTP Email Verification** step.

---

## How to Use the App

### As a Customer
1. Register a new account (choose Customer role) and verify your email via OTP
2. Go to **Dashboard** or **Salons** to browse your bookings and salons
3. Click any salon to see its services and the barbers inside
4. Each barber shows their rating, reviews, specializations, and bio
5. Click **View Profile** to open the barber profile page
6. Click **Book Appointment** to start a booking
7. Select a date — the app shows only free time slots for that day
8. Choose one or more services, then enter your phone number and optional notes
9. Click **Confirm Booking**
10. Go to **My Bookings** to see all your bookings
11. You can **cancel** any pending or confirmed booking
12. Once a booking is marked Completed by the barber, you can leave a **star rating + review** from the barber profile or booking history
13. The 🔔 bell icon in the top bar shows notifications when your booking status changes

### As a Shop Owner
1. Register a new account (choose Shop Owner role) and verify your email
2. Upon verification, your Salon is automatically created and linked to your account
3. Go to **Shop Dashboard** to update your salon details
4. Use the **Services** section to add what services your shop offers and their prices
5. Add barbers to your shop and manage their details

### As a Barber
1. Log in as a barber (added by a shop owner)
2. **Dashboard** — see all your bookings split by status tabs (pending, confirmed, completed, cancelled)
3. Earnings cards at the top show total revenue, this month's revenue, and completed booking count
4. Click **Confirm** on pending bookings or **Mark Completed** when the service is done
5. Click **Availability** in the top menu to:
   - Toggle which time slots you work each day
   - Add specific dates when you are unavailable (holidays, leaves)

### As an Admin
1. Log in as admin (admin@barber.com / admin123)
2. **Stats tab** — see total bookings, revenue, users, salons, and charts
3. **Salons tab** — see all salons and which Shop Owner manages them
4. **Bookings tab** — see every booking on the platform, change any booking's status
5. **Users tab** — see all registered users, delete accounts (cannot delete admin)

---

## All Features

| Feature | Description |
|---|---|
| Role-based login | Customer, Shop Owner, Barber, Admin — each sees different pages |
| Registration OTP Verification | 2-step registration using email OTP verification |
| Salon Management | Shop Owners manage their own salons, services, and barbers |
| Salon search | Search by name, filter by city |
| Barber profiles | Public page with rating, reviews, specializations, bio |
| Smart time slots | Only free slots shown when booking — booked/blocked slots hidden |
| My Bookings | Full booking history with cancel and review options |
| Review system | Star rating + comment after a completed booking, updates barber's rating |
| Notification bell | Bell icon shows unread count, lists recent booking updates |
| Email notifications | Emails for OTPs and password resets (Gmail SMTP supported) |
| Barber availability | Set working hours, block off specific dates |
| Earnings dashboard | Cards showing total earned, this month, completed bookings |
| Admin stats & charts | Bar chart (bookings/day) + doughnut chart (by status) via Chart.js |
| Forgot password | Sends a reset link by email, expires in 1 hour |
| Profile edit | Update your name, phone number, avatar image URL |
| JWT refresh tokens | Sessions stay logged in for 30 days |
| Dark mode | Click 🌙 in the top bar to switch, preference saved across sessions |
| Loading skeletons | Animated shimmer effect while pages load |
| Pagination | Admin booking and user tables show 10 rows per page |
| Mobile friendly | Works on phone screens |

---

## Project Folder Structure

```
Balor-Smart_Grooming_and_Salon_Platform\
├── backend\
│   ├── middleware\
│   │   └── auth.js              ← checks JWT token and user role
│   ├── models\
│   │   ├── User.js              ← name, email, password, role
│   │   ├── Salon.js             ← salon name, address, image
│   │   ├── Barber.js            ← barber info, rating, availability
│   │   ├── Booking.js           ← booking details and status
│   │   ├── Review.js            ← star rating and comment
│   │   └── Notification.js      ← in-app notifications
│   ├── routes\
│   │   ├── auth.js              ← login, register, forgot/reset password
│   │   ├── salons.js            ← CRUD for salons
│   │   ├── barbers.js           ← CRUD for barbers, available slots
│   │   ├── bookings.js          ← create booking, cancel, status update
│   │   ├── reviews.js           ← submit review, get reviews
│   │   ├── notifications.js     ← get and mark notifications
│   │   ├── users.js             ← edit profile
│   │   └── admin.js             ← stats, manage all users/bookings
│   ├── utils\
│   │   └── mailer.js            ← Nodemailer email sender
│   ├── .env                     ← config (port, DB URL, JWT secret)
│   ├── server.js                ← main Express app
│   └── package.json
│
└── frontend\
    ├── src\
    │   ├── api\
    │   │   └── axios.js         ← sends token with every request automatically
    │   ├── components\
    │   │   ├── Navbar.jsx       ← top navigation bar
    │   │   ├── ProtectedRoute.jsx  ← blocks pages from wrong roles
    │   │   ├── NotificationBell.jsx ← bell icon with dropdown
    │   │   ├── LoadingSkeleton.jsx  ← animated loading placeholder
    │   │   └── Pagination.jsx   ← prev/next page buttons
    │   ├── context\
    │   │   ├── AuthContext.jsx  ← stores logged-in user info
    │   │   └── ThemeContext.jsx ← dark/light mode state
    │   ├── pages\
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   ├── ForgotPassword.jsx
    │   │   ├── ResetPassword.jsx
    │   │   ├── Profile.jsx
    │   │   ├── user\
    │   │   │   ├── Salons.jsx       ← browse all salons
    │   │   │   ├── SalonDetail.jsx  ← barbers inside a salon
    │   │   │   ├── BookingForm.jsx  ← booking form with live slots
    │   │   │   └── MyBookings.jsx   ← booking history
    │   │   ├── barber\
    │   │   │   ├── Dashboard.jsx    ← booking management + earnings
    │   │   │   ├── Availability.jsx ← set slots and blocked dates
    │   │   │   └── PublicProfile.jsx ← public barber page with reviews
    │   │   └── admin\
    │   │       └── Dashboard.jsx    ← stats, salons, barbers, bookings, users
    │   ├── App.jsx              ← all page routes
    │   ├── main.jsx             ← app entry point
    │   └── index.css            ← global styles + dark mode variables
    ├── index.html
    └── package.json
```

---

## API Endpoints Reference

| Method | URL | Who can use it |
|---|---|---|
| POST | /api/auth/register | Anyone |
| POST | /api/auth/login | Anyone |
| POST | /api/auth/verify-otp | Unverified Users (Registration step 2) |
| POST | /api/auth/forgot-password | Anyone |
| POST | /api/auth/reset-password/:token | Anyone |
| POST | /api/auth/refresh | Anyone with refresh token |
| GET | /api/salons | Public |
| GET | /api/salons/:id | Public |
| GET | /api/barbers/:id | Public |
| GET | /api/barbers/:id/available-slots?date= | Public |
| GET | /api/reviews/barber/:id | Public |
| POST | /api/bookings | Customer |
| GET | /api/bookings/my | Customer |
| PATCH | /api/bookings/:id/cancel | Customer |
| POST | /api/reviews | Customer |
| GET | /api/bookings/barber | Barber |
| GET | /api/bookings/barber/earnings | Barber |
| PUT | /api/barbers/working-slots | Barber |
| PATCH | /api/bookings/:id/status | Barber or Admin |
| GET | /api/admin/stats | Admin |
| GET | /api/admin/bookings | Admin |
| GET | /api/admin/users | Admin |
| GET | /api/notifications | Any logged-in user |
| PATCH | /api/notifications/read | Any logged-in user |
| GET | /api/users/me | Any logged-in user |
| PATCH | /api/users/profile | Any logged-in user |

---

## Common Problems on Windows

**"mongod is not recognized as a command"**
MongoDB is not added to PATH. Fix it:
1. Search for **Environment Variables** in the Windows Start menu
2. Click **Environment Variables** button
3. Under **System variables**, find **Path** and click **Edit**
4. Click **New** and add: `C:\Program Files\MongoDB\Server\7.0\bin`
5. Click OK on all windows, then restart Command Prompt

**"Cannot connect to MongoDB" when starting the backend**
MongoDB service is not running. Open Command Prompt as Administrator and run:
```cmd
net start MongoDB
```

**"Port 5000 already in use"**
Something else is using port 5000. Either:
- Close the other app using that port
- Or open `backend\.env` in Notepad and change `PORT=5000` to `PORT=5001`, then restart the backend

**"npm is not recognized as a command"**
Node.js is not installed or not added to PATH. Reinstall Node.js from https://nodejs.org and make sure to tick **"Add to PATH"** during setup.

**"npm install fails with permission error"**
Run Command Prompt as Administrator:
- Press **Win + S**, search for `cmd`
- Right-click **Command Prompt** → **Run as administrator**
- Then run `npm install` again

**Frontend shows a blank white page**
The backend is not running. Make sure you have started the backend (Step 7) in a separate Command Prompt window before opening the browser.

**I cannot see the `.env` file in File Explorer**
Windows hides files starting with a dot by default. In File Explorer:
- Click **View** in the top menu
- Tick **Hidden items**
The `.env` file will now appear.

**Forgot password email not working / no email received**
The app uses Ethereal (a free test email service) by default — no real email is sent. Instead, look at the **backend Command Prompt window** for a line like:
```
[MAIL] Preview URL: https://ethereal.email/message/abc123...
```
Copy that URL and open it in your browser to see what the email looks like.

---

## How to Stop the App

- Press **Ctrl + C** in each Command Prompt window (backend and frontend)
- Type `Y` if it asks to confirm
- You can close the windows after that

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router v6, Axios, Chart.js |
| Backend | Node.js, Express.js |
| Database | MongoDB with Mongoose |
| Auth | JWT (access + refresh tokens), bcryptjs |
| Email | Nodemailer with Ethereal (free test inbox, no setup needed) |
| Build tool | Vite |
