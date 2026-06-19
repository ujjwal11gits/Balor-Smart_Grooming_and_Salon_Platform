# Comprehensive Vercel & Render Deployment Guide
### React (Vite) on Vercel + Node.js (Express) on Render + MongoDB (Cloud Atlas)

This guide contains step-by-step instructions for deploying a full-stack MERN/Vite application using free-tier Platform-as-a-Service (PaaS) providers: **Vercel** for the frontend and **Render** for the backend.

---

## 🛠️ Prerequisites
* An account on [Vercel](https://vercel.com) (connected to GitHub).
* An account on [Render](https://render.com) (connected to GitHub).
* Your project codebase uploaded to a GitHub repository.
* A cloud database (like MongoDB Atlas) with an active connection string.

---

## 📋 General Placeholders vs. Project Examples
* `<your-vercel-domain>` $\rightarrow$ *Example: `https://barber-app-frontend.vercel.app`*
* `<your-render-domain>` $\rightarrow$ *Example: `https://barber-app-backend.onrender.com`*
* `<your-repo-url>` $\rightarrow$ *Example: `https://github.com/ujjwal11gits/Balor-Smart_Grooming_and_Salon_Platform.git`*
* `<mongodb-uri>` $\rightarrow$ *Example: `mongodb+srv://competeujjwal_db_user:...@cluster0...`*

---

# 🎨 Phase 1: Deploying Frontend to Vercel

### **Step 1: Configure Vercel Routing Rules**
* **What it does:** React uses client-side routing (React Router). We must tell Vercel to route all URL requests to `index.html` so that page refreshes on paths like `/login` or `/dashboard` don't result in a "404 Not Found" error.
* **Instructions:**
  Create a file named `vercel.json` in the root of your `frontend` directory:
  ```json
  {
    "rewrites": [
      {
        "source": "/(.*)",
        "destination": "/index.html"
      }
    ]
  }
  ```

---

### **Step 2: Connect GitHub & Configure Build on Vercel**
* **What it does:** Connects Vercel to your GitHub repo to trigger automatic builds when you push updates.
* **Instructions:**
  1. Log into your **Vercel Dashboard** and click **Add New** $\rightarrow$ **Project**.
  2. Import your GitHub repository (`Balor-Smart_Grooming_and_Salon_Platform`).
  3. In the configuration window:
     * **Framework Preset:** Select **Vite** (or leave it on *Other* if detected automatically).
     * **Root Directory:** Edit this and set it to **`frontend`** (since your frontend code is nested inside the `frontend` folder).
     * **Build & Development Settings:** Leave these as default:
       * Build Command: `npm run build`
       * Output Directory: `dist`
       * Install Command: `npm install`

---

### **Step 3: Add Environment Variables on Vercel**
* **What it does:** Tells the React frontend where your backend server is located in production.
* **Instructions:**
  1. Expand the **Environment Variables** section on the Vercel project setup page.
  2. Add the following key-value pair:
     * **Key:** `VITE_API_URL`
     * **Value:** `<your-render-domain>` *(Example: `https://barber-app-backend.onrender.com`)*
  3. Click **Deploy**.
  4. Once finished, copy your assigned Vercel URL (e.g., `https://barber-app-frontend.vercel.app`).

---

# ⚙️ Phase 2: Deploying Backend to Render

### **Step 4: Create a Web Service on Render**
* **What it does:** Sets up a running Node.js runtime to host your Express API server.
* **Instructions:**
  1. Log into your **Render Dashboard** and click **New +** $\rightarrow$ **Web Service**.
  2. Select **Build and deploy from a Git repository** and click **Next**.
  3. Connect your GitHub repository (`Balor-Smart_Grooming_and_Salon_Platform`).

---

### **Step 5: Configure Build and Start Commands**
* **What it does:** Configures the directory and commands Render needs to build and start your Express server.
* **Instructions:**
  1. In the Web Service configuration form:
     * **Name:** `barber-app-backend`
     * **Region:** Select the region closest to your database/users (e.g. *Singapore* or *Oregon*).
     * **Branch:** `main`
     * **Root Directory:** Set this to **`backend`** (since backend code is nested in the `/backend` folder).
     * **Runtime:** Select **Node**.
     * **Instance Type:** Select **Free**.
     * **Build Command:** `npm install`
     * **Start Command:** `npm start` (which runs `node server.js` from package.json).

---

### **Step 6: Add Environment Variables on Render**
* **What it does:** Passes database connection keys, secrets, and CORS domains to the backend process securely.
* **Instructions:**
  1. Scroll down and click **Advanced** $\rightarrow$ **Add Environment Variable**.
  2. Add the following keys and values:
     * `PORT` $\rightarrow$ `5000` (Render will map this to port 80/443 automatically).
     * `MONGO_URI` $\rightarrow$ `<your-mongodb-atlas-uri>`
     * `JWT_SECRET` $\rightarrow$ `your-jwt-secret`
     * `JWT_REFRESH_SECRET` $\rightarrow$ `your-refresh-secret`
     * `SESSION_EXPIRY_DAYS` $\rightarrow$ `30`
     * `FRONTEND_URL` $\rightarrow$ `<your-vercel-domain>` *(Example: `https://barber-app-frontend.vercel.app` - This is crucial for CORS and session cookies to work).*
     
     *(Optional SMTP Mail configurations):*
     * `SMTP_HOST` $\rightarrow$ `smtp.gmail.com`
     * `SMTP_PORT` $\rightarrow$ `587`
     * `SMTP_USER` $\rightarrow$ `example@gmail.com`
     * `SMTP_PASS` $\rightarrow$ `app_password_here`
  3. Click **Create Web Service**.
  4. Wait for the logs to say `Build successful` and `Server running on port 5000`. Copy the assigned Render Web Service URL.

---

### **Step 7: Connect the Frontend and Backend**
* **What it does:** Links the frontend and backend so they can communicate.
* **Instructions:**
  1. Go back to your **Vercel Dashboard**.
  2. Navigate to your project $\rightarrow$ **Settings** $\rightarrow$ **Environment Variables**.
  3. Edit your `VITE_API_URL` variable.
  4. Paste your newly created **Render Web Service URL** (e.g., `https://barber-app-backend.onrender.com`) as the value.
  5. Save the variable.
  6. Go to the **Deployments** tab on Vercel, click the three dots next to your latest deployment, and click **Redeploy** to apply the updated URL.

---

# 🔄 Pushing Updates and Saving Changes (CI/CD)

### **Why it is easy:**
Both Vercel and Render have automated **Continuous Integration / Continuous Deployment (CI/CD)** via GitHub. 

### **How to update:**
Whenever you modify your project code locally:
1. Stage and commit your changes:
   ```bash
   git add .
   git commit -m "added a new page"
   ```
2. Push your changes to your remote GitHub repository:
   ```bash
   git push origin main
   ```
3. **What happens next:**
   * **Vercel** instantly detects the push to the `main` branch, pulls the new `frontend/` changes, and redeploys the frontend.
   * **Render** instantly detects the push, pulls the new `backend/` changes, rebuilds, and restarts your backend service.
   * *Your changes will reflect live on the website in about 2–3 minutes with zero commands executed on your end!*
