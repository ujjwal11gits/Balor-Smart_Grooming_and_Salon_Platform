# Part 3: React 18 & Modern Frontend Engineering

> **Target Role:** SDE 1 / SDE 2 (Product MNCs)  
> **Tech Stack Focus:** React 18, Fiber Architecture, Vite, Axios Interceptors, State Management, Web Performance

---

## 📌 Table of Contents
1. [Virtual DOM, Fiber Engine & Reconciliation Algorithm](#q1-what-is-the-virtual-dom-and-how-does-react-18s-fiber-reconciler-work)
2. [React 18 Concurrent Rendering & Automatic Batching](#q2-what-are-the-new-concurrent-rendering-features-in-react-18)
3. [State Management Comparison: Context API vs Redux vs Zustand vs React Query](#q3-tech-stack-comparison-context-api-vs-redux-toolkit-vs-zustand-vs-react-query)
4. [CSR vs SSR vs SSG vs ISR Rendering Paradigms](#q4-tech-stack-comparison-client-side-rendering-csr-vs-server-side-rendering-ssr-vs-ssg-vs-isr)
5. [`useMemo` vs `useCallback` vs `React.memo`](#q5-when-should-you-use-usememo-usecallback-and-reactmemo-and-when-is-it-overkill)
6. [`useEffect` vs `useLayoutEffect` vs `useInsertionEffect`](#q6-what-is-the-difference-between-useeffect-uselayouteffect-and-useinsertioneffect)
7. [Custom Hooks Design (`useAuth`, `useDebounce`)](#q7-how-do-you-design-clean-reusable-custom-hooks-in-react)
8. [Resolving `useEffect` Stale Closure & Memory Leak Traps](#q8-how-do-you-avoid-stale-closures-and-unmounted-memory-leaks-in-useeffect)
9. [Controlled vs Uncontrolled Components & Form Performance](#q9-what-is-the-difference-between-controlled-and-uncontrolled-form-components)
10. [Code Splitting with `React.lazy()` and `Suspense`](#q10-how-do-you-implement-code-splitting-and-lazy-loading-in-a-vite--react-spa)
11. [Why Array Index as Key is an Anti-Pattern](#q11-why-is-using-array-indices-as-keys-an-anti-pattern-in-react)
12. [Context API Re-render Optimization Strategies](#q12-how-do-you-prevent-all-consumers-from-re-rendering-when-a-context-value-changes)
13. [Axios Interceptors for JWT Refresh & Global Error Resiliency](#q13-how-do-axios-interceptors-manage-jwt-authentication-tokens-in-the-frontend)
14. [Vite vs Webpack: Development Build Architecture](#q14-tech-stack-comparison-why-is-vite-drastically-faster-than-webpack)
15. [Core Web Vitals Optimization (LCP, INP, CLS)](#q15-what-are-core-web-vitals-and-how-do-you-optimize-them-in-a-react-application)
16. [React Synthetic Event System & Event Delegation](#q16-how-does-reacts-synthetic-event-system-work-under-the-hood)
17. [Error Boundaries for Fallback UI Resiliency](#q17-what-are-error-boundaries-and-why-can-they-only-be-class-components)
18. [`useRef` vs `useState` & DOM Manipulation](#q18-what-is-the-difference-between-useref-and-usestate)
19. [Debouncing vs Throttling Event Handlers](#q19-what-is-the-difference-between-debouncing-and-throttling-with-real-examples)
20. [Protected Routes & Role-Based Access Control in React Router v6](#q20-how-do-you-implement-protected-routes-and-rbac-guards-in-react-router-v6)
21. [Chart.js Integration & Canvas Cleanup in React](#q21-how-do-you-prevent-canvas-reuse-memory-leaks-when-rendering-chartjs-in-react)
22. [CSS Architecture: Vanilla CSS vs Tailwind CSS vs Styled-Components](#q22-tech-stack-comparison-vanilla-css-modules-vs-tailwind-css-vs-css-in-js)
23. [Theme System Implementation (Dark/Light Mode)](#q23-how-is-a-darklight-theme-switcher-implemented-efficiently)
24. [React SSR Hydration Mismatch & Selective Hydration](#q24-what-causes-hydration-mismatch-errors-in-ssr-and-how-does-selective-hydration-solve-it)
25. [Micro-Frontends vs Monolithic Frontend SPAs](#q25-what-is-micro-frontend-architecture-and-when-should-you-adopt-it)

---

### Q1: What is the Virtual DOM, and how does React 18's Fiber Reconciler work?

**Difficulty:** Core Concept  
**Importance:** 🔥🔥🔥🔥🔥

#### Intuitive Explanation:
Directly manipulating the browser DOM is expensive because layout recalculations (reflow) and painting take substantial CPU time. 

React creates an in-memory lightweight JS object representation of the UI called the **Virtual DOM**.

```
  State Change
       │
       ▼
[ New Virtual DOM Tree ] ──► (Diffing Algorithm: Heuristic O(N)) ◄── [ Current Fiber Tree ]
                                         │
                                         ▼
                            [ Compute Minimum Mutations ]
                                         │
                                         ▼
                            [ Commit to Real Browser DOM ]
```

#### Fiber Architecture Breakdown:
Prior to React 16 (Stack Reconciler), reconciliation was synchronous and un-interruptible, blocking the main UI thread during heavy updates.

**React Fiber** breaks rendering into incremental units of work (Fibers). It splits rendering into two phases:
1. **Render Phase (Asynchronous & Interruptible):** Computes differences between Fiber nodes. Low-priority renders (e.g. background list updates) yield control back to the browser if high-priority events (typing in an input) arrive.
2. **Commit Phase (Synchronous & Un-interruptible):** Applies calculated DOM mutations to the real browser screen.

---

### Q2: What are the new Concurrent Rendering features in React 18?

**Difficulty:** Modern React  
**Importance:** 🔥🔥🔥🔥🔥

1. **Automatic Batching:** React 18 automatically batches state updates triggered inside promises, timeouts, and native event handlers into a single re-render pass (saving unnecessary frames).
2. **`useTransition()`:** Marks non-urgent state updates as transitions so high-priority user input stays responsive:
   ```javascript
   const [isPending, startTransition] = useTransition();
   // Urgent: Update search input text immediately
   setSearchQuery(input);
   // Non-urgent: Defer filtering 5,000 salon cards
   startTransition(() => {
     setFilteredSalons(filterSalons(input));
   });
   ```
3. **`useDeferredValue()`:** Defers re-rendering a non-critical component prop until main thread work clears.

---

### Q3: Tech Stack Comparison: Context API vs Redux Toolkit vs Zustand vs React Query

**Difficulty:** Architectural State Design  
**Importance:** 🔥🔥🔥🔥🔥

#### 1. What is React Context API?
Built-in React mechanism (`createContext`, `useContext`) for passing global data down a component tree without manually passing props at every level.
- **Best For:** Low-frequency global UI state (Theme modes, Auth user profile, language settings).
- **Caveat:** When a context value changes, **all consuming components re-render**, regardless of whether they consume the specific property that changed.

#### 2. What is Redux Toolkit (RTK)?
Opinionated, centralized state management library for managing complex global client state with predictable unidirectional data flow (Actions -> Reducers -> Store).
- **Best For:** Large enterprise applications with complex multi-step data flows across multiple teams.
- **Features:** Redux DevTools time-travel debugging, strict immutability via Immer.js, selective selector subscriptions.

#### 3. What is Zustand?
Un-opinionated, minimalist client state management solution built on simple hooks without context providers.
- **Best For:** Medium-to-large apps wanting global client state without Redux boilerplate or Context re-render traps.
- **Features:** Transient state updates, slice subscriptions (`useStore(state => state.cartCount)`), tiny bundle size (~1KB).

#### 4. What is React Query? (TanStack Query)
Dedicated library for managing **Server State** (data fetched from remote APIs).
- **Best For:** Caching API responses, automatic background polling, optimistic UI mutations, and query invalidation.
- **Key Insight:** Completely removes the need to store API data in Redux or Zustand stores!

---

#### 5. Detailed Architectural Comparison:

| Category | React Context API | Redux Toolkit (RTK) | Zustand | React Query (TanStack) |
| :--- | :--- | :--- | :--- | :--- |
| **Primary Use Case** | Low-frequency global state (Themes, User Auth). | Complex global client state across large enterprise teams. | Minimalist, un-opinionated global client state. | **Server State** management (Caching, background polling, mutations). |
| **Boilerplate** | Low | Medium-High | Extremely Low | Low |
| **Re-render Scope** | Rerenders **all consumers** unless split carefully. | Selective component subscription. | Selective state selector subscriptions. | Auto-invalidates queries based on cache keys. |
| **Recommendation:** | Use **Context** for Auth/Theme, and **React Query** / **Axios** for API data. |

---

### Q4: Tech Stack Comparison: Client-Side Rendering (CSR) vs Server-Side Rendering (SSR) vs SSG vs ISR

**Difficulty:** Web Performance Architecture  
**Importance:** 🔥🔥🔥🔥

#### 1. What is Client-Side Rendering (CSR)? (Used in Balor Vite SPA)
The server returns a minimal HTML shell containing an empty `<div id="root"></div>` and a JavaScript script tag.
- **How it works:** The browser downloads the JS bundle, executes React, builds the DOM tree, and makes client-side API requests.
- **Tradeoffs:** Slower initial First Contentful Paint (FCP), poor out-of-the-box SEO, but zero server CPU load during page navigation.

#### 2. What is Server-Side Rendering (SSR)? (Next.js)
The web server renders full HTML per incoming HTTP request dynamically.
- **How it works:** On every request, the server fetches API data, generates HTML strings, and streams them to the browser.
- **Tradeoffs:** Ultra-fast initial page render and perfect SEO, but introduces server CPU load per request.

#### 3. What is Static Site Generation (SSG)?
HTML pages are compiled once at **build time**.
- **How it works:** During deployment build, pages are pre-rendered into static HTML files served directly via CDN.
- **Tradeoffs:** Blazing-fast response times and zero server load, but content is static until the next deployment.

#### 4. What is Incremental Static Regeneration (ISR)?
Combines SSG build times with on-demand background regeneration.
- **How it works:** Static HTML is served instantly, but stale pages automatically revalidate in the background when requested after a time interval.

---

#### 5. Summary Comparison Matrix:

| Paradigm | How it Works | First Contentful Paint (FCP) | SEO Impact | Server CPU Load |
| :--- | :--- | :--- | :--- | :--- |
| **CSR (React SPA - Used in Balor)** | Browser downloads empty HTML shell (`<div id="root">`), fetches JS bundle, executes React, and calls APIs. | Slower initial load | Poor out-of-the-box (Requires pre-rendering tools) | **Zero server load** (Static host). |
| **SSR (Next.js)** | Server renders full HTML per request and streams to browser. | Ultra Fast | Excellent | High per-request CPU load. |
| **SSG** | HTML generated once at **build time**. | Blazing Fast | Excellent | Zero per-request CPU load. |
| **ISR** | Regenerates static pages in background on-demand (`revalidate`). | Blazing Fast | Excellent | Low. |

---

### Q5: When should you use `useMemo`, `useCallback`, and `React.memo`, and when is it overkill?

**Difficulty:** Optimization Pitfalls  
**Importance:** 🔥🔥🔥🔥🔥

#### 1. What is `React.memo`?
A Higher-Order Component (HOC) that wraps a component to memoize its rendered UI output.
- **How it works:** Skips re-rendering the child component if its `props` have not changed according to shallow equality comparison.

#### 2. What is `useMemo`?
A Hook that caches the **computed return value** of a heavy calculation across renders.
- **How it works:** Executes the calculation function only when dependency array variables change:
  ```javascript
  const sortedBarbers = useMemo(() => calculateTopBarbers(barbers), [barbers]);
  ```

#### 3. What is `useCallback`?
A Hook that caches a **function instance reference** across component renders.
- **How it works:** Prevents passing newly recreated inline function references to child components on every parent re-render:
  ```javascript
  const handleSelectSlot = useCallback((slotId) => { ... }, []);
  ```

> ⚠️ **When it's overkill:** Premature optimization adds memory overhead (closure allocations). Do NOT wrap simple functions or cheap array iterations in `useCallback`/`useMemo` unless profiling proves a re-render bottleneck.

---

### Q6: What is the difference between `useEffect`, `useLayoutEffect`, and `useInsertionEffect`?

**Difficulty:** React Core Lifecycle  
**Importance:** 🔥🔥🔥🔥

#### 1. What is `useEffect`? (Asynchronous)
Runs **asynchronously AFTER browser layout and paint** phase completes.
- **Use Case:** Data fetching, subscribing to sockets, setting up timers—operations that do not visually mutate layout synchronously.

#### 2. What is `useLayoutEffect`? (Synchronous)
Runs **synchronously AFTER DOM mutations, but BEFORE browser paint**.
- **Use Case:** Measuring element dimensions (`getBoundingClientRect()`), adjusting scroll positions, or positioning tooltips synchronously to prevent visual flicker on screen.

#### 3. What is `useInsertionEffect`? (Pre-DOM)
Runs **synchronously BEFORE DOM mutations are committed**.
- **Use Case:** Primarily used by CSS-in-JS libraries (Styled-Components, Emotion) to inject dynamic `<style>` rules into DOM before layout measurement reads.

---

### Q7: How do you design clean, reusable Custom Hooks in React?

**Difficulty:** Code Quality  
**Importance:** 🔥🔥🔥🔥

A custom hook encapsulates stateful business logic away from UI components.

```javascript
// src/hooks/useFetch.js
import { useState, useEffect } from 'react';
import axios from 'axios';

export function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController(); // 👈 Handles cancellation
    axios.get(url, { signal: controller.signal })
      .then(res => setData(res.data))
      .catch(err => { if (!axios.isCancel(err)) setError(err); })
      .finally(() => setLoading(false));

    return () => controller.abort(); // Cleanup on unmount
  }, [url]);

  return { data, loading, error };
}
```

---

### Q8: How do you avoid Stale Closures and Unmounted Memory Leaks in `useEffect`?

**Difficulty:** Bug Prevention  
**Importance:** 🔥🔥🔥🔥

- **Stale Closure:** Occurs when a function inside `useEffect` references state/props but leaves them out of the dependency array `[]`, trapping values from the initial render.
- **Unmounted Memory Leak:** Setting state after an async API call returns on an unmounted component. Solved by returning an **`AbortController` cleanup function**.

---

### Q9: What is the difference between Controlled and Uncontrolled form components?

**Difficulty:** React Forms  
**Importance:** 🔥🔥🔥

#### 1. What is a Controlled Component?
Form input value is driven directly by React component state (`useState`).
- **Mechanism:** `<input value={name} onChange={e => setName(e.target.value)} />`.
- **Pros:** Instant inline field validation, conditional field disabling, dynamic UI response.
- **Cons:** Re-renders component on every keystroke.

#### 2. What is an Uncontrolled Component?
Form input value is stored directly by native browser DOM node.
- **Mechanism:** React accesses the input value on submission via `useRef()` (`inputRef.current.value`).
- **Pros:** Higher typing performance in large complex forms (zero re-renders on keystrokes).
- **Cons:** Harder to implement real-time per-keystroke validation.

---

### Q10: How do you implement Code Splitting and Lazy Loading in a Vite + React SPA?

**Difficulty:** Web Performance  
**Importance:** 🔥🔥🔥🔥

Instead of shipping a single massive `index.js` bundle (e.g. 5MB), split admin dashboards into separate dynamic chunk files loaded on-demand.

```javascript
import React, { lazy, Suspense } from 'react';

// Lazy load heavy Admin Dashboard component
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));

function App() {
  return (
    <Suspense fallback={<div className="spinner">Loading Module...</div>}>
      <Routes>
        <Route path="/admin" element={<AdminDashboard />} />
      </Routes>
    </Suspense>
  );
}
```

---

### Q11: Why is using Array Indices as Keys an anti-pattern in React?

**Difficulty:** Core Bug Case  
**Importance:** 🔥🔥🔥🔥

When array items are reordered, prepended, or deleted, index keys (`key={index}`) shift. React matches Fiber nodes by key, causing React to reuse stateful DOM nodes incorrectly (e.g., input checkboxes checking the wrong item). Always use unique, persistent IDs (`key={item.id}`).

---

### Q12: How do you prevent all consumers from re-rendering when a Context value changes?

**Difficulty:** Performance Tuning  
**Importance:** 🔥🔥🔥🔥

1. **Split Contexts:** Separate state value from setter actions (`AuthValueContext` and `AuthActionsContext`).
2. **Memoize Context Value:** Wrap context value object in `useMemo()`:
   ```javascript
   const value = useMemo(() => ({ user, role }), [user, role]);
   return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
   ```

---

### Q13: How do Axios Interceptors manage JWT Authentication tokens in the frontend?

**Difficulty:** Practical Architecture  
**Importance:** 🔥🔥🔥🔥🔥 (Used in `frontend/src/api/axios.js`)

```javascript
// Request Interceptor: Attach Access Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Response Interceptor: Catch 401 & Auto Refresh Token
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      const newToken = await refreshAccessToken();
      error.config.headers.Authorization = `Bearer ${newToken}`;
      return api(error.config); // Retry original request seamlessly
    }
    return Promise.reject(error);
  }
);
```

---

### Q14: Tech Stack Comparison: Why is Vite drastically faster than Webpack?

**Difficulty:** Build Tool Architecture  
**Importance:** 🔥🔥🔥🔥

#### 1. What is Webpack?
A traditional JavaScript module bundler.
- **How it works:** Before launching the development server, Webpack constructs a complete dependency graph of the entire application, crawling every single import statement and compiling all code into a monolithic JS bundle file.
- **Drawbacks:** As codebase size grows (1,000+ files), cold start server boot times take 30–60 seconds, and Hot Module Replacement (HMR) updates get progressively slower.

#### 2. What is Vite?
A modern frontend build tool designed for native browser module execution.
- **How it works:** 
  1. **Dependencies:** Pre-bundles third-party `node_modules` dependencies using **`esbuild`** (written in Go, 10–100x faster than JS-based bundlers).
  2. **Source Code:** Serves source code over native **Browser ES Modules (`<script type="module">`)**. The dev server transforms modules strictly on-demand as requested by the active browser route.
- **Advantages:** Instant dev server start (<300ms) regardless of project size; lightning-fast HMR.

---

### Q15: What are Core Web Vitals, and how do you optimize them in a React application?

**Difficulty:** Web Performance  
**Importance:** 🔥🔥🔥🔥

1. **LCP (Largest Contentful Paint < 2.5s):** Time taken to render the largest visible image/text block. *Fix: Compress hero images, use WebP, optimize server response.*
2. **INP (Interaction to Next Paint < 200ms):** Measures UI responsiveness after user interactions. *Fix: Use `useTransition()`, break long tasks.*
3. **CLS (Cumulative Layout Shift < 0.1):** Measures visual instability caused by elements jumping around. *Fix: Set explicit `width` and `height` dimensions on images and banners.*

---

### Q16: How does React's Synthetic Event System work under the hood?

**Difficulty:** React Internals  
**Importance:** 🔥🔥🔥

React does not attach event listeners to individual DOM nodes. Instead, it uses **Event Delegation**, attaching a single top-level event listener at the root container (`<div id="root">`). When an event triggers, React wraps the native browser event in a cross-browser normalized **`SyntheticEvent`** wrapper.

---

### Q17: What are Error Boundaries, and why can they only be Class Components?

**Difficulty:** Error Resiliency  
**Importance:** 🔥🔥🔥

Error Boundaries catch JS errors anywhere in their child component tree during rendering, lifecycle methods, and constructors, displaying a fallback UI instead of crashing the entire React app. They require `componentDidCatch` or `getDerivedStateFromError`, lifecycle hooks that do not currently have Hook equivalents in functional components.

---

### Q18: What is the difference between `useRef` and `useState`?

**Difficulty:** Core Hook Mechanics  
**Importance:** 🔥🔥🔥🔥

#### 1. What is `useState`?
React state Hook used to manage values that directly drive visual UI rendering.
- **How it works:** Updating state (`setState(newValue)`) schedules a component re-render, recalculates the Virtual DOM, and updates the browser screen.

#### 2. What is `useRef`?
React ref Hook used to persist a mutable `.current` object across renders.
- **How it works:** Changing `ref.current = newValue` **does NOT trigger a component re-render**.
- **Use Cases:** Storing native DOM node references, keeping timer/interval IDs, storing previous prop/state values across renders.

---

#### 3. Summary Comparison:

| Property | `useState` | `useRef` |
| :--- | :--- | :--- |
| **Triggers Re-render?**| **Yes** | **No** |
| **Persistence** | Persists value across renders. | Persists mutable `.current` object across renders. |
| **Use Case** | UI state driving visual changes. | Direct DOM access, keeping timers/interval IDs. |

---

### Q19: What is the difference between Debouncing and Throttling with real examples?

**Difficulty:** Algorithmic UI Performance  
**Importance:** 🔥🔥🔥🔥

#### 1. What is Debouncing?
Delays function execution until user activity **has ceased for `N` milliseconds**.
- **How it works:** Resets the delay timer every time a new trigger event occurs. Function runs only once user stops triggering events.
- **Real Example:** Salon Search Bar autocomplete input. Waits until user stops typing for 300ms before triggering an API fetch call.

#### 2. What is Throttling?
Enforces a maximum execution rate, limiting function calls to **once per `N` milliseconds**.
- **How it works:** Ignores subsequent trigger events during the cooldown window `N`.
- **Real Example:** Window scroll event listener or infinite-scroll pagination trigger. Fires every 200ms regardless of how fast the user scrolls.

---

### Q20: How do you implement Protected Routes and Role-Based Access Control in React Router v6?

**Difficulty:** Frontend Security  
**Importance:** 🔥🔥🔥🔥🔥

```javascript
// src/components/ProtectedRoute.jsx
import { Navigate, Outlet } from 'react-router-dom';

export function ProtectedRoute({ allowedRoles }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />; // Render child nested routes
}
```

---

### Q21: How do you prevent canvas reuse memory leaks when rendering Chart.js in React?

**Difficulty:** UI Dashboard Bugs  
**Importance:** 🔥🔥🔥 (Relevant to Admin & Owner dashboards)

Chart.js binds instance contexts to `<canvas>` elements. If a parent component re-renders without destroying the previous chart instance, Chart.js throws `"Canvas is already in use"` error. Always call `chartInstance.destroy()` inside `useEffect` cleanup return function.

---

### Q22: Tech Stack Comparison: Vanilla CSS Modules vs Tailwind CSS vs CSS-in-JS

**Difficulty:** Styling Architecture  
**Importance:** 🔥🔥🔥

#### 1. What is Vanilla CSS / CSS Modules? (Used in Balor)
Native CSS files compiled into locally scoped classnames.
- **Pros:** Zero runtime JavaScript overhead, full native browser CSS variable support (`var(--primary-color)`), standard CSS syntax.

#### 2. What is Tailwind CSS?
Utility-first atomic CSS framework.
- **Pros:** Rapid inline development with predefined utility classes (`bg-blue-500 flex items-center`), tiny production build size via PurgeCSS.
- **Cons:** Can clutter JSX markup with long classname strings.

#### 3. What is CSS-in-JS? (Styled-Components / Emotion)
Writing component styles directly inside JavaScript template literals.
- **Pros:** Dynamic styling based on component props (`color: props => props.active ? 'blue' : 'gray'`).
- **Cons:** Increases JavaScript bundle size and introduces style parsing performance overhead during component re-renders.

---

### Q23: How is a Dark/Light Theme Switcher implemented efficiently?

**Difficulty:** CSS Architecture  
**Importance:** 🔥🔥🔥

Set CSS variables on `:root` and switch a data attribute on `document.documentElement.setAttribute('data-theme', 'dark')`.

```css
:root { --bg-color: #ffffff; --text-color: #111111; }
[data-theme="dark"] { --bg-color: #0f172a; --text-color: #f8fafc; }

body { background-color: var(--bg-color); color: var(--text-color); }
```

---

### Q24: What causes Hydration Mismatch errors in SSR, and how does Selective Hydration solve it?

**Difficulty:** Advanced SSR  
**Importance:** 🔥🔥🔥

A hydration mismatch happens when server-rendered HTML string differs from initial client React rendering output (e.g. rendering `new Date()` or `window.innerWidth`). React 18 **Selective Hydration** uses Suspense boundaries to hydrate interactive parts of the page independently without waiting for heavy JS bundles to load.

---

### Q25: What is Micro-Frontend Architecture, and when should you adopt it?

**Difficulty:** Frontend HLD  
**Importance:** 🔥🔥🔥

Micro-Frontends split a massive single web app into independently developed, tested, and deployed sub-applications (e.g. Header App, Booking Checkout App, Admin Dashboard App) combined via **Module Federation**. Recommended for huge engineering organizations (>50+ devs), but adds complexity for small teams.

---
