# Balor — Frontend System Architecture & Design Guide

This guide details the complete frontend implementation of the Balor grooming booking system, detailing all folder layouts, state management flows, dynamic components, responsive features, and API integrations. Use this document to review the frontend structure, UI architecture, and design patterns.

---

## 1. Folder Architecture & Entry Points

The frontend is a Single Page Application (SPA) built with **React 18**, **React Router v6**, and **Vite**.

### Directory Structure
```
frontend/
├── public/
│   └── _redirects           # Netlify client-side routing fallback configuration
├── src/
│   ├── api/
│   │   └── axios.js         # Axios HTTP client equipped with JWT refresh interceptors
│   ├── components/
│   │   ├── ErrorBoundary.jsx # React class-based client crash fallback screen
│   │   ├── LoadingSkeleton.jsx # Shimmer effect placeholder card
│   │   ├── Navbar.jsx       # Header bar and responsive mobile navigation drawer
│   │   ├── NotificationBell.jsx # Polling notification indicator dropdown
│   │   ├── Pagination.jsx   # Tabular lists page controller
│   │   └── ProtectedRoute.jsx # Role-based route guard
│   ├── context/
│   │   ├── AuthContext.jsx  # Customer sessions and user profile states
│   │   └── ThemeContext.jsx # Dark/Light theme toggles
│   ├── pages/
│   │   ├── Login.jsx        # Login page containing password reset state machine
│   │   ├── Register.jsx     # Registration forms with Indian phone number validator
│   │   ├── Profile.jsx      # Personal information updates and role badges
│   │   ├── user/
│   │   │   ├── Salons.jsx       # Salon search cards, filters, and Quick Book row
│   │   │   ├── SalonDetail.jsx  # Salon info page, operating statuses, and barber profiles
│   │   │   ├── BookingForm.jsx  # Segmented time-slots, smart add-ons, and booking submissions
│   │   │   └── MyBookings.jsx   # Booking lists, cancels, and reviews modals
│   │   ├── barber/
│   │   │   ├── Dashboard.jsx    # Barber bookings lists, earnings charts, and OTP completion modals
│   │   │   └── Availability.jsx # Barber working slots toggles and holidays calendar
│   │   ├── shop/
│   │   │   └── Dashboard.jsx    # Shop profile editor, service lists, and reviews modals
│   │   └── admin/
│   │       └── Dashboard.jsx    # Platform graphs, salons manager, and user tables
│   ├── utils/
│   │   └── status.js        # Active salon checks (Open/Closed) and time formatters
│   ├── App.jsx              # Main routing hub and global boundaries setup
│   ├── index.css            # Custom CSS variables, responsive grids, and typography
│   ├── main.jsx             # React DOM root entry point
│   └── vercel.json          # Vercel client-side routing fallback configuration
```

---

## 2. Global State & Context Providers

Balor uses two primary React Context Providers to maintain global state:

### A. Authentication Context (`AuthContext.jsx`)
- **Purpose**: Tracks active user profile information (`auth`), handles initial profile loading, and coordinates login/logout processes.
- **Session Persistence**: Reads initial session token from `localStorage` on boot.
- **Logout flow**: Clears local storage variables and local state:
  ```javascript
  const logout = async () => {
    try {
      await api.post('/auth/logout'); // Clears secure HTTP-only refresh cookie
    } catch (err) {
      console.error('Server logout failed:', err);
    } finally {
      localStorage.clear();
      setAuth(null);
    }
  };
  ```
- **Name Dynamic Update**: Updates the user's display name in local storage and active context dynamically when changed via the profile edit form:
  ```javascript
  const updateAuthName = (newName) => {
    localStorage.setItem('name', newName);
    setAuth((prev) => prev ? { ...prev, name: newName } : null);
  };
  ```

### B. Theme Context (`ThemeContext.jsx`)
- **Purpose**: Controls the light/dark theme state.
- **Mechanism**: Toggles a `.dark-theme` class on the `document.documentElement` element, which swaps root CSS variables (e.g. `--bg`, `--text`, `--border`) instantly. Persists choice inside `localStorage`.

### C. Axios Client & Token Interceptors (`api/axios.js`)
Axios attaches access tokens to outgoing requests and intercepts expired sessions automatically:
```javascript
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true // Permits secure HttpOnly refresh cookie transmission
});

// 1. Request Interceptor: Attaches JWT Access Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 2. Response Interceptor: Silent Token Refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await api.post('/auth/refresh'); // Requests new access token
        localStorage.setItem('token', data.accessToken);
        api.defaults.headers.common['Authorization'] = `Bearer ${data.accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        
        processQueue(null, data.accessToken);
        return api(originalRequest); // Retries failed request
      } catch (refreshError) {
        processQueue(refreshError, null);
        // If refresh fails, session is dead -> force log out
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);
```

---

## 3. Navigation & Route Security

### A. Protected Route Guard (`ProtectedRoute.jsx`)
Guards frontend routes from unauthorized access. Supports role arrays for multi-role page access (e.g. allowing both `user` and `shop` to view barber profiles):
```javascript
export default function ProtectedRoute({ children, role }) {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (role) {
    const rolesArray = Array.isArray(role) ? role : [role];
    if (!rolesArray.includes(user.role)) {
      return <Navigate to="/" replace />;
    }
  }

  return children;
}
```

### B. Responsive Hamburger Drawer Navigation (`Navbar.jsx`)
- **Desktop Layout**: Renders navbar links and profile controls horizontally.
- **Mobile Layout**: Hides links on viewports `<= 768px`. Displays a hamburger menu button. Tapping it opens a custom-styled sliding sidebar (`mobile-menu-drawer`) for links and authentication CTAs.
- **Persistent Utilities**: Keeps the theme switch toggle, notification bell, and user avatar directly visible on the top header bar across all viewport sizes.

---

## 4. Page Architecture & Custom Features

### A. Visual Time-Slot Picker (`BookingForm.jsx` / Quick Book Drawer)
Instead of standard dropdown select lists, slots are rendered in interactive grid blocks:
1. **Separation**: Split into Morning (🌅), Afternoon (☀️), and Evening (🌆) using time thresholds (Morning: `< 12:00`, Afternoon: `>= 12:00` and `< 17:00`, Evening: `>= 17:00`).
2. **Interactive States**:
   - *Available*: Green styling, clickable.
   - *Booked/Passed*: Disabled, grey background, dashed slash style.
   - *Fast-Filling*: Orange styling (indicates high demand).
3. **Legend**: Shows color indicators at the top.

### B. Smart Service Add-ons & Up-selling Cart
Implemented to drive sales:
1. When at least one primary service is checked, a dashed card container displays additional unselected services.
2. Clicking an add-on recalculates prices and durations inline.
3. Automatically triggers an API request to fetch available time slots corresponding to the new total duration.

### C. "Quick Book Again" Avatar Row & Drawer
Enables repeat customers to re-book in under 5 seconds:
1. **Avatar Row**: Placed at the top of the salon search list, displaying circular avatars of favorite or recently booked barbers. Includes a lightning bolt (⚡) indicator.
2. **Slide-in Drawer**: Tapping a barber slides in a right-hand drawer (`slideInRight` keyframe animation) containing:
   - Barber profile details.
   - Date picker, service selector, and time-slot grid.
   - Prefilled user phone number (fetched asynchronously from `/users/me` on component mount).
   - Sticky headers and footers to keep action buttons tapable on small viewports.

### D. Collapsible Search Filters (`Salons.jsx`)
To prevent dropdown menus from squeezing on mobile screens, we added a collapsible filter grid:
- **Responsive Toggle**: Replaces the inline layout on viewports `<= 768px` with a **⚙️ Filter Options** button.
- **Active Indicators**: Selected dropdowns turn light red with a bold border, showing how many active parameters are applied.
- **Real-Time Client-side Sorting**: Evaluates matching items on key entry without network latency.

### E. Global React Error Boundary (`components/ErrorBoundary.jsx`)
Prevents runtime JavaScript crashes from rendering blank pages:
- Implemented as a React class component.
- Implements `getDerivedStateFromError` to set `hasError: true`.
- Renders an error recovery UI showing a warning icon, a description, and buttons to **🔄 Reload Page** or return **🏠 Home**.
- Placed inside `App.jsx` wrapping `<Routes>`, which keeps the navbar visible and working.

### F. Developer Test Mode OTP Banner (Onboarding Fallback)
To ensure the application remains testable out-of-the-box on hosting environments without requiring immediate SMTP email setup:
1. In both `Register.jsx` (registration flow) and `Login.jsx` (forgot password flow), the client checks the response payload from the backend for a `testOtp` property.
2. If `testOtp` is present, it is saved in the component's local state.
3. A styled warning banner (`📧 Test Mode: OTP is: ...`) is conditionally rendered inside the OTP input forms, allowing developers and reviewers to register and verify flows immediately without email delivery.

### G. Premium Landing Page Additions ("Built by Professionals" & "Our Mission")
To elevate the platform's landing experience:
1. **Philosophy Grid**: Renders three standardized value cards (Innovation First, Customer Centric, Quality Assured) detailed with custom vector circular icon badges.
2. **Mission Split Layout**: Incorporates side-by-side vertical cards clearly dividing resources and values for **Barbers** (scheduling, portfolios) vs **Customers** (instant slot picking, verified profiles).
3. **Lift Transition Keyframes**: Applied `.prof-card:hover` and `.mission-card:hover` to scale elements upward by 5px and add interactive shadow depths.

### H. SVG Scissors Emoji Favicon
To replace browser fallback icons with native brand assets:
1. Created a lightweight, high-performance [favicon.svg](file:///d:/barber_app/barber-app/frontend/public/favicon.svg) containing a scalable scissors emoji `✂️`.
2. Loaded it inside the HTML header configuration to ensure it displays globally on all platforms and devices.

---

## 5. Frontend Technical & System Design FAQ

### Q1: Explain how the Axios interceptor handles JWT refresh tokens silently.
* **Answer**: We use response interceptors. When an API request fails with a `401 Unauthorized` status (meaning the access token has expired), the interceptor locks subsequent requests and makes a `POST /auth/refresh` request. If the refresh request succeeds, we save the new access token in `localStorage`, update the default headers, and replay the original request. If the refresh request fails (e.g. session expired), we clear storage and redirect the user to `/login`.

### Q2: Why is it important to prevent request duplication when multiple requests fail with 401 simultaneously?
* **Answer**: If a page makes multiple concurrent API calls and the access token expires, all requests fail with `401` at the same time. Without queueing, the client would trigger multiple `/refresh` requests, causing server overhead or race conditions. We solve this by using an `isRefreshing` lock flag and pushing pending requests into a `failedQueue` array, which we resolve once the refresh finishes.

### Q3: What is the benefit of using class-based Error Boundaries in React?
* **Answer**: Error boundaries catch JavaScript errors anywhere in their child component tree, log those errors, and display a fallback UI instead of crashing the application. React hooks do not yet have equivalents for `getDerivedStateFromError` or `componentDidCatch`, so they must be implemented using class components.

### Q4: How did you implement mobile responsive layouts for the dashboard charts?
* **Answer**: We replaced static size variables on the Chart.js canvas elements with a responsive CSS grid class (`.dashboard-charts-grid`). This grid uses a single column (`1fr`) on viewports `<= 900px` and two columns on larger screens. We also applied `min-width: 0` to the grid containers to prevent Chart.js canvas elements from expanding beyond their boundaries and causing horizontal overflow.

### Q5: How do you handle dark mode styling variables in this project?
* **Answer**: We use CSS Custom Properties (variables) defined in `index.css`. We define standard color sets under `:root` and override them under a `.dark-theme` class. The `ThemeContext` toggles this class on `document.documentElement`, changing variables like `--bg` and `--text` globally.

### Q6: How does the "Quick Book" drawer prefill data to optimize booking times?
* **Answer**: When the dashboard or search page mounts, it calls the `GET /users/me` endpoint to fetch the user's details. If the user has a phone number set, it pre-populates the phone field in the Quick Book drawer. This reduces the checkout flow to simply picking a date, service, and slot.

### Q7: Why did you use sticky headers and footers inside the Quick Book drawer?
* **Answer**: In mobile viewports, long scrolling forms can push the booking submit button off-screen. Using `position: sticky` on the drawer header and footer keeps the barber's profile and the "Confirm Booking" action button permanently visible, while the middle section containing services and slots scroll independently.

### Q8: What does the `noValidate` form attribute do and why did you use it?
* **Answer**: `noValidate` disables the browser's default validation tooltips (like "Please fill out this field" bubbles). We used it because we want to use our custom inline field validation styling (`.input-error` red borders and error text overlays) to maintain design consistency.

### Q9: How do you implement the slider animation for the Quick Book drawer?
* **Answer**: We use CSS transition animations. The drawer is styled with `position: fixed; right: 0; top: 0; transform: translateX(100%); transition: transform 0.3s ease-out;`. When the state triggers the drawer open, we apply a class that sets `transform: translateX(0);`, sliding it smoothly into view.

### Q10: How does `flex-shrink: 0` help in horizontal-scrolling tabs?
* **Answer**: By default, flex items shrink to fit inside their container. If you have many tabs, they will squeeze and wrap onto multiple lines. Setting `flex-shrink: 0` on the tab buttons prevents them from shrinking below their content width, allowing the tab container to scroll horizontally on mobile screens.

### Q11: Explain how the search search query filters salons client-side.
* **Answer**: Instead of triggering a backend API call on every keystroke, the backend returns the full list of salons on mount. We filter this list in memory using the user's input:
```javascript
const filtered = salons.filter(s => 
  s.name.toLowerCase().includes(query.toLowerCase()) || 
  s.address.toLowerCase().includes(query.toLowerCase())
);
```
This offers instantaneous search results and eliminates server load during user input.

### Q12: How did you implement real-time notification updates?
* **Answer**: We set up a polling interval (`setInterval`) inside the `NotificationBell` component. Every 30 seconds, it triggers a `GET /api/notifications` API request to fetch the latest notifications and updates the unread badge count in the header.

### Q13: How does the `ProtectedRoute` handle multiple allowed roles?
* **Answer**: The `role` prop can accept an array of roles (e.g. `role={['user', 'shop']}`). Inside `ProtectedRoute`, we check if the user's role is included in the array using `rolesArray.includes(user.role)`. If true, it renders the page; otherwise, it redirects to the home page.

### Q14: Why do we use `useNavigate` inside the AuthContext logout flow instead of standard HTML links?
* **Answer**: Standard links (`<a href="/login">`) trigger a full browser reload, which resets all React states and memory cache. Using `useNavigate` from `react-router-dom` performs client-side routing, keeping state transitions smooth and fast.

### Q15: What is the purpose of the `LoadingSkeleton` component?
* **Answer**: Skeletons mimic the layout of pages while data is being fetched. We use them with keyframe animations (a shimmering gradient overlay) to reduce perceived page load times, creating a premium feel compared to generic spinning wheels.

### Q16: How does the frontend handle missing SMTP server configuration on deployment?
* **Answer**: We implemented a "Test OTP Fallback" UI. In both `Register.jsx` and `Login.jsx` components, if the registration or forgot-password OTP requests return a `testOtp` string in the response data, the page saves it to state and displays an explicit, friendly notification banner informing the user/tester of the code. This ensures a seamless onboarding test flow without hard-blocking users if they haven't configured SMTP hosts yet.

### Q17: Why did you use SVG and Unicode emojis for the favicon instead of standard PNG images?
* **Answer**: SVG-based emoji favicons are extremely lightweight (less than 1KB), scale infinitely without pixelation, require no image asset loading overhead, and load instantly on all modern browsers. It keeps the bundle sizes minimal while maintaining clean branding.

### Q18: How does the API client prevent request failures if the backend URL configuration is incorrect?
* **Answer**: The Axios instance automatically trims trailing slashes from `process.env.VITE_API_URL` to avoid double-slashes in URLs. Additionally, it detects if the absolute backend URL is missing the `/api` suffix and automatically appends it before initiating connections, eliminating common environment variable misconfiguration bugs.
