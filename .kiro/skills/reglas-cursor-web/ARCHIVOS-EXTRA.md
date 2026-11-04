# Archivos extra de `reglas-cursor-web`

No caben en el paquete de Kiro (máx. 25 archivos por skill).
- **Documentación** (✅ incluida): su contenido completo está más abajo en este archivo.
- **Datos / código / binarios** (⬇️): descárgalos a la ruta indicada solo si la tarea los necesita:

```bash
mkdir -p "$(dirname <archivo>)" && curl -fsSL <enlace> -o <archivo>
```

| Archivo | Estado | Enlace |
|---------|--------|--------|
| `README.md` | ✅ incluida abajo | https://raw.githubusercontent.com/paillamilm-blip/mis-skills/main/kiro-skills/04-codigo-calidad/reglas-cursor-web/README.md |
| `cursorrules/nextjs-vercel-supabase-cursorrules-prompt-file.mdc` | ✅ incluida abajo | https://raw.githubusercontent.com/paillamilm-blip/mis-skills/main/kiro-skills/04-codigo-calidad/reglas-cursor-web/cursorrules/nextjs-vercel-supabase-cursorrules-prompt-file.mdc |
| `mdc/next-js.mdc` | ✅ incluida abajo | https://raw.githubusercontent.com/paillamilm-blip/mis-skills/main/kiro-skills/04-codigo-calidad/reglas-cursor-web/mdc/next-js.mdc |
| `mdc/playwright.mdc` | ✅ incluida abajo | https://raw.githubusercontent.com/paillamilm-blip/mis-skills/main/kiro-skills/04-codigo-calidad/reglas-cursor-web/mdc/playwright.mdc |
| `mdc/react-query.mdc` | ✅ incluida abajo | https://raw.githubusercontent.com/paillamilm-blip/mis-skills/main/kiro-skills/04-codigo-calidad/reglas-cursor-web/mdc/react-query.mdc |
| `mdc/vitest.mdc` | ✅ incluida abajo | https://raw.githubusercontent.com/paillamilm-blip/mis-skills/main/kiro-skills/04-codigo-calidad/reglas-cursor-web/mdc/vitest.mdc |
| `mdc/zod.mdc` | ✅ incluida abajo | https://raw.githubusercontent.com/paillamilm-blip/mis-skills/main/kiro-skills/04-codigo-calidad/reglas-cursor-web/mdc/zod.mdc |
| `mdc/zustand.mdc` | ✅ incluida abajo | https://raw.githubusercontent.com/paillamilm-blip/mis-skills/main/kiro-skills/04-codigo-calidad/reglas-cursor-web/mdc/zustand.mdc |

---

## 📄 `README.md`

# Reglas Cursor Web — atribución

Selección curada (28 archivos `.mdc`) para el stack de la web de captación, tomada de:

| Repo | Carpeta copiada | Licencia |
|------|-----------------|----------|
| [sanjeed5/awesome-cursor-rules-mdc](https://github.com/sanjeed5/awesome-cursor-rules-mdc) | `rules-mdc/` → [`mdc/`](./mdc/) (13 reglas) | CC0 1.0 — [LICENSE](./LICENSE-awesome-cursor-rules-mdc) |
| [PatrickJS/awesome-cursorrules](https://github.com/PatrickJS/awesome-cursorrules) | `rules/` → [`cursorrules/`](./cursorrules/) (15 reglas) | CC0 1.0 — [LICENSE](./LICENSE-awesome-cursorrules) |

Archivos copiados sin modificar. La guía de uso está en [SKILL.md](./SKILL.md).

## Usar en Cursor

```bash
mkdir -p mi-proyecto/.cursor/rules
cp kiro-skills/04-codigo-calidad/reglas-cursor-web/mdc/{react,vite,typescript,tailwind,shadcn}.mdc mi-proyecto/.cursor/rules/
```

## Usar en Kiro

```bash
cp -r kiro-skills/04-codigo-calidad/reglas-cursor-web mi-proyecto/.kiro/skills/
```

---

## 📄 `cursorrules/nextjs-vercel-supabase-cursorrules-prompt-file.mdc`

---
description: "Cursor rules for Next.js development with Vercel and Supabase integration."
globs: **/*
alwaysApply: false
---
# Cursorrules

## Intro

I am building 'BA Copilot', where BA stands for Business Analysts. I will sometimes refer to it as bacp.

## BA Copilot MVP

### Overview

It is an assistant for business analysts. The MVP will be a an ai chatbot type tool, which will render BPMN diagrams using bpmn-js. The user can then iterate on them either with:

- additional discussion
- editing the diagram directly (bpmn-js supports this)

### UI Description

Here is a hierarchical, indented bullet description of the BA Copilot MVP, focusing on its functionality for creating and iterating on BPMN diagrams:

BA Copilot Interface

Question Input Section

Users can input questions or requests related to business processes. Example: "Based on the doc content what have I missed?"

Process Section (Optional)

Allows users to upload or view BPMN diagrams in formats like .png, .vsdx, etc. Users can visualize and edit existing diagrams or create new ones. Example: A BPMN diagram showing a flow of "Register expense report", "Approve", and "Deny" processes.

Documents Section (Optional)

Users can upload relevant documents, such as PDFs, that might contain process details. Example: "Shelter - employee handbook.pdf" uploaded to provide context for the BPMN diagram.

Artifacts Section

Provides a space for related outputs or references to be displayed. Example: Diagram suggestions based on uploaded content.

Iterative BPMN Diagram Creation and Modification

Input Process

Users can pose questions or requests for modifications to existing processes. Example: Asking for missing steps in the process based on document content.

AI-Powered Suggestions

The system suggests additions or modifications to the BPMN diagram based on the content of uploaded documents or user queries. Example: Suggestion to add a task for checking the expense policy, citing specific sections from the uploaded handbook.

Diagram Editing

Users can interactively edit the BPMN diagram based on suggestions. Example: Adding a task "Check expense policy" with inputs and outputs like "Expense report" and "Checked expense report".

Documentation and References

The system references uploaded documents and highlights relevant sections. Example: Citing "Section 7. Claiming reimbursement for payments made on behalf of the company" from the employee handbook.

User Workflow

Start with a Question

User initiates the process by asking a question or making a request.

Upload Process Diagrams and Documents

User uploads existing diagrams and documents for context.

Receive AI-Generated Suggestions

System provides suggestions to enhance or correct the process flow.

Modify BPMN Diagram

User edits the BPMN diagram based on the received suggestions.

Iterate Until Satisfied

User continues to ask follow-up questions and modify the diagram until the desired outcome is achieved.

This BA Copilot MVP allows users to efficiently create, modify, and iterate on BPMN diagrams with contextual suggestions, leveraging uploaded documents and user queries.

## BA Copilot Vision

### Overview

The vision for this is that it will be the home for business analysts to get assistance relating to their jobs. It will protect itself network effects to increase the value of the product e.g. BA agencies posting their products in the toolkit section, and members discussing BA topics in community section. It will also protect itself via an ever improving model for BA tasks e.g. BPMN generation. Although it will never be trained on user data. It will grow via virality via a dropbox style 'refer a friend and you both get 100 AI credits'. Revenue will be via companies paying for it for their BAs. Revenue will also be via companies paying to list on the job board.

### UI Description

This UI for the Business Analyst (BA) Copilot is designed to facilitate various tasks related to business analysis. Here's a description of its features:

Header Section

The top navigation bar displays the application name "BA Copilot" and provides options like sharing the prototype and accessing user settings.

Left Sidebar Navigation

Home: The main dashboard or landing page of the BA Copilot. Assistant: A section likely dedicated to personalized assistance or guided help. Vault: A storage area for important documents or resources. Library: A collection of resources, templates, or reference materials. History: Access to past interactions, tasks, or saved work. Toolkit: Tools or utilities that support various BA activities. Community: A section for engaging with other users, discussing best practices, or sharing knowledge. Job Board: An area for job-related resources, possibly listing openings or career opportunities. Settings: User-specific settings, located at the bottom, allowing for customization of the BA Copilot experience. User Information: At the bottom, the user's email is displayed (e.g., alex@tesla.com), along with a security note indicating data is secure.

Main Content Area

Central Interaction Box

A prominent text box labeled "Ask anything..." invites users to enter questions, requests, or commands. This is the primary interface for interacting with the BA Copilot.

Quick Action Buttons

Below the interaction box, several buttons offer shortcuts to common BA tasks: Create flowchart from requirements: Generates a process flowchart based on a list of requirements. Create requirements from flowchart: Extracts and documents requirements from an existing flowchart. Create documentation from notes: Converts meeting notes or other informal documentation into formal documents. Create tests from documentation: Develops test cases or scripts based on existing documentation. Give me career advice: Provides personalized career guidance or resources. Recommend a toolkit: Suggests tools or software relevant to the user's current tasks or projects.

Overall Layout

The interface is clean, minimalist, and user-friendly, with a clear emphasis on functionality and ease of use. It is designed to guide users smoothly through typical BA tasks while providing easy access to tools and resources. This UI embodies the vision of a comprehensive yet streamlined tool tailored to assist business analysts in their day-to-day tasks, making their work more efficient and organized.

## Technical

### Overview

The following elements of the stack are ones I'm confident I'll build with:

- Next.js using App router, not Pages router always check that you have not made a recommendation that is for Pages router always check that your recommendation is appropriate for App router
- Vercel AI
- Supabase - db, including their type safety
- Supabase - auth
- Tanstack query
- Material UI
- Potentially Orval for API calls (typing, tanstack query, and mock service worker testing)
- Quokka

I have intermediate experience with React. However, I am new to Next.js. So whenever implementing something with Next.js, teach me as if I don't know about it. Then offer to explain more. If you feel I should replace elements of my stack above, always tell me. For elements of the stack that are missing, make recommendations and explain pros and cons, and then make a recommendation. My app folder is src/app Never create app/Creating app/ will break things

### Devias Template

This workspace contains:

- the repo that I'm building in (ba-copilot-main, or ba-copilot)
- a repo that I'm building from: nextjs-template-typescript

nextjs-template-typescript is a template made my Devias Kit Pro herein Devias. I will bring elements in from their repo to mine. So be aware of that, and consider recommending bringing elements in from there as well, and following their coding style and structure.

---

## 📄 `mdc/next-js.mdc`

---
description: This guide defines definitive best practices for Next.js applications, focusing on the `app` directory, Server Components, performance, and maintainability. Follow these rules to build robust, scalable, and performant Next.js projects.
globs: **/*.{js,jsx,ts,tsx}
---
# next-js Best Practices

This document outlines the definitive best practices for developing Next.js applications. Adhering to these guidelines ensures consistent, performant, and maintainable code, leveraging Next.js's strengths for modern web development.

## 1. Code Organization and Structure

Always use the `app/` directory for new projects. Organize code by feature, not by type, to improve discoverability and cohesion.

### ✅ GOOD: Feature-Driven `app/` Directory

Group all related files for a feature (components, pages, layouts, hooks, types) within a single directory.

```tsx
// app/dashboard/page.tsx
export default function DashboardPage() { /* ... */ }

// app/dashboard/layout.tsx
export default function DashboardLayout({ children }) { /* ... */ }

// app/dashboard/components/DashboardOverview.tsx
export function DashboardOverview() { /* ... */ }

// app/dashboard/hooks/useDashboardData.ts
export function useDashboardData() { /* ... */ }
```

### ❌ BAD: Type-Driven `app/` Directory

Avoid scattering files of the same feature across different top-level type directories.

```tsx
// app/dashboard/page.tsx
// components/dashboard/DashboardOverview.tsx // Separated
// hooks/useDashboardData.ts // Separated
```

### Core Directories

*   **`app/`**: All route-related files (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `route.ts`).
*   **`components/`**: Reusable UI components that are *not* directly tied to a specific route.
*   **`lib/`**: Backend-agnostic utility functions, data access layers, and third-party integrations.
*   **`hooks/`**: Custom React hooks for reusable logic.
*   **`types/`**: Global TypeScript type definitions and interfaces.
*   **`public/`**: Static assets (images, fonts) that are served directly.

## 2. Component Architecture: Server Components First

Prioritize Server Components for all UI rendering. Use Client Components only when interactivity (state, effects, event handlers) is strictly required.

### ✅ GOOD: Server Component by Default

Server Components reduce client-side JavaScript bundles, improve initial page load, and enhance security by keeping sensitive logic on the server.

```tsx
// app/products/[id]/page.tsx (Server Component by default)
import { getProductDetails } from '@/lib/api';

export default async function ProductPage({ params }) {
  const product = await getProductDetails(params.id);
  return (
    <div>
      <h1>{product.name}</h1>
      {/* ... more server-rendered UI */}
      <AddToCartButton productId={product.id} /> {/* Client Component */}
    </div>
  );
}
```

### ✅ GOOD: "use client" Boundary as Low as Possible

Place the `"use client"` directive at the lowest possible point in your component tree. This ensures that only the interactive parts are client-rendered, keeping parent components as Server Components.

```tsx
// components/AddToCartButton.tsx
'use client'; // Only this component and its children are client-side

import { useState } from 'react';

export function AddToCartButton({ productId }) {
  const [quantity, setQuantity] = useState(1);
  // ... interactive logic
  return <button onClick={() => alert(`Added ${quantity} of ${productId}`)}>Add to Cart</button>;
}
```

### ❌ BAD: Overuse of "use client"

Don't mark entire feature folders or layouts as client components if only a small part needs interactivity. This unnecessarily increases client bundle size.

```tsx
// app/products/[id]/page.tsx (BAD: entire page marked client)
'use client'; // This makes the whole page a client component
import { useState, useEffect } from 'react'; // Even if only a small part needs it

export default function ProductPage({ params }) {
  // ...
  return <button>Add to Cart</button>;
}
```

## 3. Data Fetching

Fetch data directly in Server Components using `fetch` or a dedicated data access layer. Use Route Handlers for client-side mutations or when exposing a specific API endpoint.

### ✅ GOOD: Server Component Data Fetching

Directly fetch data in Server Components. `fetch` requests are automatically memoized and cached by Next.js.

```tsx
// app/dashboard/page.tsx
import { getUserProfile, getRecentOrders } from '@/lib/api';

export default async function DashboardPage() {
  // Data fetches in parallel
  const [user, orders] = await Promise.all([
    getUserProfile(),
    getRecentOrders(),
  ]);

  return (
    <div>
      <h2>Welcome, {user.name}</h2>
      <OrderList orders={orders} />
    </div>
  );
}
```

### ✅ GOOD: Route Handlers for Client-Side Mutations

Use `route.ts` for API endpoints that handle client-side data mutations (e.g., form submissions, API calls from client components).

```tsx
// app/api/cart/route.ts
import { NextResponse } from 'next/server';
import { addToCart } from '@/lib/cart';

export async function POST(request: Request) {
  const { productId, quantity } = await request.json();
  await addToCart(productId, quantity);
  return NextResponse.json({ success: true });
}
```

### ✅ GOOD: Streaming with `loading.tsx` and `Suspense`

Improve perceived performance by showing instant loading states for slow data fetches.

```tsx
// app/dashboard/loading.tsx
export default function Loading() {
  return <div>Loading dashboard...</div>;
}

// app/dashboard/page.tsx (assuming some slow component)
import { Suspense } from 'react';
import { SlowComponent } from './components/SlowComponent';

export default async function DashboardPage() {
  return (
    <main>
      <h1>Dashboard</h1>
      <Suspense fallback={<div>Loading slow data...</div>}>
        <SlowComponent />
      </Suspense>
    </main>
  );
}
```

## 4. Performance Considerations

Leverage Next.js's built-in optimizations for images, fonts, and code splitting.

### ✅ GOOD: `next/image` for Images

Always use `next/image` for local and remote images. It provides automatic optimization, lazy loading, and responsive sizing.

```tsx
import Image from 'next/image';
import profilePic from '@/public/profile.jpg';

export function UserAvatar() {
  return (
    <Image
      src={profilePic}
      alt="User Profile"
      width={100}
      height={100}
      placeholder="blur"
    />
  );
}
```

### ❌ BAD: Native `<img>` Tag

Avoid the native `<img>` tag as it bypasses Next.js's image optimizations.

```tsx
// ❌ BAD
export function UserAvatar() {
  return <img src="/profile.jpg" alt="User Profile" width="100" height="100" />;
}
```

### ✅ GOOD: `next/font` for Fonts

Use `next/font` to optimize font loading, eliminate external network requests, and prevent layout shift.

```tsx
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.className}>
      <body>{children}</body>
    </html>
  );
}
```

### ✅ GOOD: Dynamic Imports for Heavy Components

Lazily load heavy client-side components or third-party libraries using `next/dynamic`.

```tsx
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('./components/HeavyChart'), {
  loading: () => <p>Loading chart...</p>,
  ssr: false, // Only load on client if not needed for initial render
});

export function DashboardCharts() {
  return (
    <div>
      <HeavyChart />
    </div>
  );
}
```

## 5. State Management

Keep state local where possible. For global state, use React Context for simple cases or lightweight libraries like Zustand/Jotai for more complex needs.

### ✅ GOOD: Local State with `useState`

For component-specific, ephemeral state.

```tsx
'use client';
import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>Count: {count}</button>;
}
```

### ✅ GOOD: Global State with Context or Zustand/Jotai

For application-wide state that needs to be shared across many components. Prefer Zustand or Jotai over Redux for most Next.js projects due to their simplicity and performance.

```tsx
// lib/store.ts (using Zustand)
import { create } from 'zustand';

interface BearState {
  bears: number;
  increasePopulation: () => void;
}

export const useBearStore = create<BearState>((set) => ({
  bears: 0,
  increasePopulation: () => set((state) => ({ bears: state.bears + 1 })),
}));
```

## 6. Error Handling

Implement robust error handling using Next.js's dedicated error files.

### ✅ GOOD: Route-Level `error.tsx`

Catch errors within a specific route segment, providing localized fallback UI.

```tsx
// app/dashboard/error.tsx
'use client'; // Error boundaries must be client components

import { useEffect } from 'react';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error(error); // Log the error to an error reporting service
  }, [error]);

  return (
    <div>
      <h2>Something went wrong in the dashboard!</h2>
      <button onClick={() => reset()}>Try again</button>
    </div>
  );
}
```

### ✅ GOOD: Global `global-error.tsx`

Catch uncaught errors across your entire application, providing a consistent fallback.

```tsx
// app/global-error.tsx
'use client';

export default function GlobalError({ error, reset }) {
  return (
    <html>
      <body>
        <h2>Something went wrong globally!</h2>
        <button onClick={() => reset()}>Try again</button>
      </body>
    </html>
  );
}
```

### ✅ GOOD: `not-found.tsx` for 404s

Create a custom 404 page for unmatched routes.

```tsx
// app/not-found.tsx
export default function NotFound() {
  return (
    <div>
      <h1>404 - Page Not Found</h1>
      <p>The page you are looking for does not exist.</p>
    </div>
  );
}
```

## 7. ESLint and Type Checking

Enforce code quality and catch common issues early with ESLint and TypeScript.

### ✅ GOOD: Use `eslint-config-next/core-web-vitals`

This configuration elevates performance-related warnings to errors, ensuring your application meets Core Web Vitals standards. Always combine with `eslint-config-next/typescript` for TypeScript projects.

```javascript
// eslint.config.mjs
import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript'; // For TypeScript projects

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs, // Include for TypeScript
  {
    rules: {
      // Custom overrides or additional rules here
      '@next/next/no-img-element': 'error', // Enforce next/image
      // ...
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;
```

## 8. Common Pitfalls and Anti-patterns

Avoid these common mistakes to maintain a high-quality Next.js application.

### ❌ BAD: Using `<a>` for Internal Navigation

This bypasses Next.js's automatic prefetching and client-side navigation.

```tsx
// ❌ BAD
<a href="/dashboard">Go to Dashboard</a>
```

### ✅ GOOD: Use `<Link>` for Internal Navigation

Enables client-side navigation and prefetching for a smoother user experience.

```tsx
import Link from 'next/link';

// ✅ GOOD
<Link href="/dashboard">Go to Dashboard</Link>
```

### ❌ BAD: Async Client Components

Client Components cannot be `async`. If you need to fetch data on the client, use `useEffect` or a client-side data fetching library.

```tsx
// components/MyClientComponent.tsx
'use client';

// ❌ BAD: Client Components cannot be async
export default async function MyClientComponent() {
  // const data = await fetch('/api/data');
  return <div>Client UI</div>;
}
```

### ✅ GOOD: Client-Side Data Fetching in Client Components

Use `useEffect` or a dedicated client-side library (like SWR or React Query) for data fetching in Client Components.

```tsx
// components/MyClientComponent.tsx
'use client';
import { useState, useEffect } from 'react';

export default function MyClientComponent() {
  const [data, setData] = useState(null);

  useEffect(() => {
    async function fetchData() {
      const res = await fetch('/api/data');
      const json = await res.json();
      setData(json);
    }
    fetchData();
  }, []);

  return <div>{data ? `Data: ${data.message}` : 'Loading...'}</div>;
}
```

---

## 📄 `mdc/playwright.mdc`

---
description: Definitive guidelines for writing robust, maintainable, and high-quality end-to-end tests with Playwright in TypeScript.
globs: **/*.{js,ts}
---
# Playwright Best Practices

Playwright is the gold standard for reliable E2E testing. These rules ensure your tests are fast, stable, and easy to maintain, aligning with modern 2025 development standards for reliability, quality, and structure.

## 1. Always Use `@playwright/test`

Leverage the official test runner for built-in fixtures, isolation, and web-first assertions. Avoid the low-level `playwright` library for E2E tests.

❌ BAD: Using `playwright` directly
```typescript
import { chromium } from 'playwright';
// ... manual browser/context setup and teardown
const browser = await chromium.launch();
const page = await browser.newPage();
// ...
await browser.close();
```

✅ GOOD: Using `@playwright/test`
```typescript
import { test, expect } from '@playwright/test';
test('should navigate to home', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Home/);
});
```

## 2. Prioritize Robust Locators

Use Playwright's built-in Locators API, favoring user-facing attributes over brittle CSS selectors. This drastically improves test stability.

❌ BAD: Fragile, implementation-dependent selectors
```typescript
await page.locator('div.container > ul > li:nth-child(2) > button').click();
```

✅ GOOD: Semantic, user-facing locators
```typescript
await page.getByRole('button', { name: 'Add to Cart' }).click();
await page.getByLabel('Username').fill('testuser');
await page.getByTestId('product-item-123').click();
```

## 3. Embrace Web-First Assertions

Playwright's `expect` assertions automatically retry until conditions are met, eliminating manual waits and flakiness. Never use `page.waitForTimeout()`.

❌ BAD: Manual, flaky waits and generic assertions
```typescript
await page.waitForTimeout(2000); // 🚨 Flaky!
const title = await page.title();
assert.equal(title, 'My Page'); // 🚨 Not web-first
```

✅ GOOD: Reliable, auto-retrying assertions
```typescript
await expect(page).toHaveTitle(/My Page/);
await expect(page.getByText('Welcome')).toBeVisible();
await expect(page.getByRole('checkbox')).toBeChecked();
```

## 4. Implement the Page Object Model (POM)

Encapsulate selectors and actions within dedicated classes. This improves readability, reusability, and maintainability.

❌ BAD: Repeated selectors and logic across tests
```typescript
// test-login.spec.ts
await page.getByLabel('Username').fill('user');
await page.getByLabel('Password').fill('pass');
await page.getByRole('button', { name: 'Login' }).click();

// test-profile.spec.ts
// ... same login steps repeated ...
```

✅ GOOD: Centralized Page Object
```typescript
// pages/LoginPage.ts
import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.getByLabel('Username');
    this.passwordInput = page.getByLabel('Password');
    this.loginButton = page.getByRole('button', { name: 'Login' });
  }

  async navigate() {
    await this.page.goto('/login');
  }

  async login(username: string, password: string) {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }
}

// tests/login.spec.ts
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

test('should successfully log in', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.navigate();
  await loginPage.login('testuser', 'password');
  await expect(page).toHaveURL(/dashboard/);
});
```

## 5. Optimize Performance with Auth State & Route Blocking

Reduce test execution time by reusing authenticated sessions and blocking unnecessary network requests.

❌ BAD: Logging in for every test and loading all assets
```typescript
test('view profile', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Username').fill('user');
  await page.getByLabel('Password').fill('pass');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.goto('/profile'); // Loads all images, analytics, etc.
});
```

✅ GOOD: Reusing auth state and blocking requests
```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';
export default defineConfig({
  use: {
    storageState: 'playwright-auth.json', // Path to save/load auth state
  },
});

// global-setup.ts (run once before all tests)
import { chromium, expect } from '@playwright/test';
export default async function globalSetup() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('/login');
  await page.getByLabel('Username').fill('testuser');
  await page.getByLabel('Password').fill('password');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.context().storageState({ path: 'playwright-auth.json' });
  await browser.close();
}

// tests/profile.spec.ts
import { test, expect } from '@playwright/test';
test('should display user profile', async ({ page, context }) => {
  // Block unnecessary resources for faster tests
  await context.route('**/*.{png,jpg,jpeg,gif,webp,svg,css}', route => route.abort());
  await page.goto('/profile'); // Automatically uses saved auth state
  await expect(page.getByText('Welcome, testuser!')).toBeVisible();
});
```

## 6. Mock APIs for Deterministic Tests

Isolate your UI tests from backend flakiness by intercepting and mocking API responses.

❌ BAD: Relying on a live, potentially unstable backend
```typescript
test('display products', async ({ page }) => {
  await page.goto('/products'); // Fetches from real API
  await expect(page.getByText('Product A')).toBeVisible();
});
```

✅ GOOD: Mocking API responses
```typescript
test('display mocked products', async ({ page }) => {
  await page.route('**/api/products', route => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 1, name: 'Mock Product' }]),
    });
  });
  await page.goto('/products');
  await expect(page.getByText('Mock Product')).toBeVisible();
});
```

## 7. Leverage CI/CD Features for Debugging

Configure tracing, screenshots, and video recording in your `playwright.config.ts` to instantly diagnose failures in CI.

```typescript
// playwright.config.ts
import { defineConfig } from '@playwright/test';
export default defineConfig({
  reporter: [['html'], ['list']],
  use: {
    trace: 'on-first-retry', // Record trace only on first retry
    screenshot: 'on',       // Always take a screenshot on failure
    video: 'on-first-retry',// Record video on first retry
  },
});
```

## 8. Maintain Code Quality with Linters & Formatters

Integrate ESLint (with Playwright plugin) and Prettier into your workflow via pre-commit hooks to enforce consistent code style and catch errors early.

```json
// package.json (example scripts)
{
  "scripts": {
    "lint": "eslint . --ext .ts",
    "format": "prettier --write .",
    "test:e2e": "playwright test"
  },
  "devDependencies": {
    "@playwright/test": "^1.x.x",
    "@typescript-eslint/eslint-plugin": "^7.x.x",
    "@typescript-eslint/parser": "^7.x.x",
    "eslint": "^8.x.x",
    "eslint-plugin-playwright": "^1.x.x",
    "prettier": "^3.x.x",
    "husky": "^9.x.x",
    "lint-staged": "^15.x.x"
  }
}
```
```javascript
// .eslintrc.js
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'playwright'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:playwright/recommended',
  ],
  rules: {
    // Add custom rules or override defaults here
  },
  env: {
    node: true,
    browser: true,
  },
};
```
```json
// .prettierrc
{
  "singleQuote": true,
  "semi": true,
  "trailingComma": "all"
}
```
```json
// .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx lint-staged
```
```json
// .lintstagedrc.js
module.exports = {
  '*.{ts,js}': ['eslint --fix', 'prettier --write'],
};
```

---

## 📄 `mdc/react-query.mdc`

---
description: Definitive guidelines for using TanStack Query (formerly React Query) to manage server state efficiently, ensure type safety, and optimize performance in React applications.
globs: **/*.{js,jsx,ts,tsx}
---
# TanStack Query (react-query) Best Practices

This document outlines the definitive best practices for using TanStack Query in our React applications. Adhering to these guidelines ensures consistent, performant, and maintainable data fetching and state management.

## 1. Query Keys: The Foundation of Caching

**ALWAYS** use stable, descriptive array keys. These are fundamental for caching, refetching, and invalidation. For dynamic data, embed parameters directly into the array.

### ✅ GOOD: Stable Array Keys & Key Factories

```typescript
// 1. Simple, static key
const USERS_KEY = ['users'];

// 2. Dynamic key with parameters
const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: { status?: string; page?: number }) =>
    [...userKeys.lists(), { filters }] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};

// Usage:
// useQuery(userKeys.all, fetchAllUsers);
// useQuery(userKeys.list({ status: 'active', page: 1 }), fetchUsers);
// useQuery(userKeys.detail(userId), fetchUserById);
```

### ❌ BAD: Unstable or Generic Keys

```typescript
// String keys are less flexible for dynamic data and filtering
useQuery('users', fetchUsers);

// Anonymous object keys are unstable and break caching
useQuery(['users', { id: userId }], fetchUserById); // Object literal creates new reference each render
```

## 2. Custom Hooks: Encapsulate Logic

**ALWAYS** wrap `useQuery` and `useMutation` calls in custom hooks. This centralizes data fetching logic, improves reusability, enhances type safety, and keeps components clean.

### ✅ GOOD: Dedicated Custom Hooks

```typescript
// hooks/useUsers.ts
import { useQuery } from '@tanstack/react-query';
import { fetchUsers, User } from '../api'; // Assume api.ts defines fetchUsers

const userKeys = {
  all: ['users'] as const,
  list: (filters: { status?: string }) => [...userKeys.all, { filters }] as const,
};

export function useUsers(filters?: { status?: string }) {
  return useQuery<User[], Error>({
    queryKey: userKeys.list(filters || {}),
    queryFn: () => fetchUsers(filters),
  });
}

// components/UserList.tsx
import { useUsers } from '../hooks/useUsers';

function UserList({ statusFilter }: { statusFilter?: string }) {
  const { data: users, isLoading, error } = useUsers({ status: statusFilter });

  if (isLoading) return <div>Loading users...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {users?.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

### ❌ BAD: Direct `useQuery` in Components

```typescript
// components/UserList.tsx
import { useQuery } from '@tanstack/react-query';
import { fetchUsers } from '../api';

function UserList({ statusFilter }: { statusFilter?: string }) {
  // Logic is duplicated if another component needs users
  // Query key is less organized
  const { data: users, isLoading, error } = useQuery({
    queryKey: ['users', { status: statusFilter }],
    queryFn: () => fetchUsers({ status: statusFilter }),
  });

  // ... rest of component
}
```

## 3. Query Functions: Separate and Stable

**NEVER** pass anonymous functions directly to `queryFn`. **ALWAYS** declare `queryFn` separately to ensure stability, prevent unnecessary re-renders, and improve testability.

### ✅ GOOD: Separated Query Functions

```typescript
// api.ts
export async function fetchUserById(id: string): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) throw new Error('Failed to fetch user');
  return response.json();
}

// hooks/useUser.ts
import { useQuery } from '@tanstack/react-query';
import { fetchUserById } from '../api';

const userKeys = {
  detail: (id: string) => ['users', id] as const,
};

export function useUser(userId: string) {
  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: () => fetchUserById(userId), // Stable reference to fetchUserById
    enabled: !!userId, // Only run if userId exists
  });
}
```

### ❌ BAD: Anonymous Query Functions

```typescript
// hooks/useUser.ts
import { useQuery } from '@tanstack/react-query';

export function useUser(userId: string) {
  return useQuery({
    queryKey: ['users', userId],
    // This anonymous function is recreated on every render, potentially causing issues
    queryFn: async () => {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) throw new Error('Failed to fetch user');
      return response.json();
    },
    enabled: !!userId,
  });
}
```

## 4. Conditional Fetching: Use `enabled`

**ALWAYS** use the `enabled` option for conditional fetching. This is the explicit and recommended way to control when a query runs.

### ✅ GOOD: Using `enabled`

```typescript
// hooks/useUserProfile.ts
import { useQuery } from '@tanstack/react-query';
import { fetchUserProfile } from '../api';

export function useUserProfile(userId?: string) {
  return useQuery({
    queryKey: ['userProfile', userId],
    queryFn: () => fetchUserProfile(userId!),
    enabled: !!userId, // Query only runs if userId is truthy
  });
}
```

### ❌ BAD: Conditional Hook Calls

```typescript
// components/UserProfile.tsx
import { useUserProfile } from '../hooks/useUserProfile';

function UserProfile({ userId }: { userId?: string }) {
  // React Hook Rules: Hooks must be called unconditionally
  // This breaks the rules and will cause bugs
  if (!userId) {
    return null;
  }
  const { data: user, isLoading } = useUserProfile(userId);
  // ...
}
```

## 5. Data Transformation: Use `select`

**ALWAYS** use the `select` option within `useQuery` for transforming or filtering data. This ensures the transformation happens once at the query level, optimizing performance and preventing redundant calculations in components.

### ✅ GOOD: `select` for Transformations

```typescript
// hooks/useActiveUsers.ts
import { useQuery } from '@tanstack/react-query';
import { fetchUsers, User } from '../api';

export function useActiveUsers() {
  return useQuery<User[], Error, string[]>({ // Specify transformed data type
    queryKey: ['users', 'all'],
    queryFn: fetchUsers,
    select: (data) => data.filter(user => user.status === 'active').map(user => user.name),
  });
}

// components/ActiveUserNames.tsx
import { useActiveUsers } from '../hooks/useActiveUsers';

function ActiveUserNames() {
  const { data: activeUserNames, isLoading } = useActiveUsers();

  if (isLoading) return <div>Loading active users...</div>;
  return (
    <ul>
      {activeUserNames?.map((name) => (
        <li key={name}>{name}</li>
      ))}
    </ul>
  );
}
```

### ❌ BAD: Transforming Data in Every Component

```typescript
// components/ActiveUserNames.tsx
import { useQuery } from '@tanstack/react-query';
import { fetchUsers } from '../api';

function ActiveUserNames() {
  const { data: users, isLoading } = useQuery({
    queryKey: ['users', 'all'],
    queryFn: fetchUsers,
  });

  // Transformation logic repeated or inefficiently placed
  const activeUserNames = users?.filter(user => user.status === 'active').map(user => user.name);

  if (isLoading) return <div>Loading active users...</div>;
  return (
    <ul>
      {activeUserNames?.map((name) => (
        <li key={name}>{name}</li>
      ))}
    </ul>
  );
}
```

## 6. Mutations and Cache Invalidation

**ALWAYS** use `useMutation` for CUD (Create, Update, Delete) operations. After a successful mutation, **ALWAYS** invalidate relevant queries to ensure the UI reflects the latest server state. For immediate feedback, consider optimistic updates with `setQueryData`.

### ✅ GOOD: Invalidation after Mutation

```typescript
// hooks/useCreateTodo.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTodo, Todo } from '../api';

export function useCreateTodo() {
  const queryClient = useQueryClient();
  return useMutation<Todo, Error, { title: string }>({
    mutationFn: createTodo,
    onSuccess: () => {
      // Invalidate all 'todos' queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });
}

// components/TodoForm.tsx
import { useCreateTodo } from '../hooks/useCreateTodo';

function TodoForm() {
  const { mutate, isLoading } = useCreateTodo();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget as HTMLFormElement);
    const title = formData.get('title') as string;
    mutate({ title });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input name="title" placeholder="New todo" />
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Adding...' : 'Add Todo'}
      </button>
    </form>
  );
}
```

### ✅ GOOD: Optimistic Updates

```typescript
// hooks/useUpdateTodo.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateTodo, Todo } from '../api';

export function useUpdateTodo() {
  const queryClient = useQueryClient();
  return useMutation<Todo, Error, Partial<Todo> & { id: string }>({
    mutationFn: updateTodo,
    // Optimistically update the cache
    onMutate: async (newTodo) => {
      await queryClient.cancelQueries({ queryKey: ['todos'] });
      const previousTodos = queryClient.getQueryData<Todo[]>(['todos']);
      queryClient.setQueryData<Todo[]>(['todos'], (old) =>
        old ? old.map((todo) => (todo.id === newTodo.id ? { ...todo, ...newTodo } : todo)) : []
      );
      return { previousTodos }; // Context for onError
    },
    onError: (err, newTodo, context) => {
      // Rollback on error
      queryClient.setQueryData(['todos'], context?.previousTodos);
    },
    onSettled: () => {
      // Always refetch after error or success to ensure data is in sync
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    },
  });
}
```

## 7. Performance: Prefetching & Defaults

**LEVERAGE** TanStack Query's defaults (e.g., `staleTime: 0`, automatic retries, refetch on window focus) and **STRATEGICALLY** use prefetching for critical user flows.

### ✅ GOOD: Prefetching for Router Integration

```typescript
// utils/routeLoaders.ts (Example with a router loader)
import { QueryClient } from '@tanstack/react-query';
import { fetchProjectById } from '../api';

export const projectLoader = (queryClient: QueryClient) => async ({ params }: { params: { projectId: string } }) => {
  const queryKey = ['projects', params.projectId];
  // Prefetch the project data during navigation
  await queryClient.prefetchQuery({
    queryKey,
    queryFn: () => fetchProjectById(params.projectId),
  });
  return null; // Or return initial data if needed
};

// components/ProjectLink.tsx
import { Link } from 'react-router-dom'; // Assuming react-router-dom
import { useQueryClient } from '@tanstack/react-query';
import { fetchProjectById } from '../api';

function ProjectLink({ projectId, projectName }: { projectId: string; projectName: string }) {
  const queryClient = useQueryClient();
  const handleMouseEnter = () => {
    // Prefetch on hover for instant page loads
    queryClient.prefetchQuery({
      queryKey: ['projects', projectId],
      queryFn: () => fetchProjectById(projectId),
      staleTime: 5 * 60 * 1000, // Keep data fresh for 5 minutes
    });
  };

  return (
    <Link to={`/projects/${projectId}`} onMouseEnter={handleMouseEnter}>
      {projectName}
    </Link>
  );
}
```

## 8. ESLint Plugin: Enforce Standards

**ALWAYS** install and configure the `@tanstack/query-eslint-plugin`. It enforces many of these best practices automatically, catching common mistakes early.

```json
// .eslintrc.json
{
  "plugins": ["@tanstack/query"],
  "rules": {
    "@tanstack/query/exhaustive-deps": "error",
    "@tanstack/query/prefer-query-object": "error",
    "@tanstack/query/stable-query-client": "error"
  }
}
```

---

## 📄 `mdc/vitest.mdc`

---
description: This guide provides opinionated, actionable best practices for writing fast, reliable, and maintainable unit and integration tests using Vitest in modern JavaScript and TypeScript projects.
globs: **/*.{js,ts,jsx,tsx}
---
# Vitest Best Practices

Vitest is the definitive testing framework for our Vite-powered projects. It offers a fast, Jest-compatible API with deep integration into the Vite ecosystem. Adhering to these guidelines ensures our tests are robust, performant, and easy to maintain.

## 1. Code Organization & Naming

**Always co-locate test files with their source.** This improves discoverability and ensures tests are updated alongside their implementation.

*   **File Naming**: Use `*.test.{ts,tsx,js,jsx}`.
*   **Location**: Place test files directly next to the component or module they test.

❌ BAD:
```
// src/components/Button/Button.tsx
// tests/components/Button.test.tsx
```

✅ GOOD:
```typescript
// src/components/Button/Button.tsx
// src/components/Button/Button.test.tsx
```

## 2. Test Structure & Isolation

**Organize tests logically using `describe` and `it` (or `test`) blocks.** Ensure each test is isolated and deterministic.

*   **`describe`**: Group related tests into suites.
*   **`it` / `test`**: Define individual test cases. Prefer `it` for consistency with Jest.
*   **Hooks (`beforeEach`, `afterEach`)**: Use these for setup and teardown to ensure test isolation.

❌ BAD: (Shared state, no cleanup)
```typescript
let user;
test('creates user', () => {
  user = createUser();
  expect(user).toBeDefined();
});
test('updates user', () => { // Depends on previous test
  user.name = 'New Name';
  expect(user.name).toBe('New Name');
});
```

✅ GOOD: (Isolated tests with hooks)
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createUser, deleteUser } from './user-service';

describe('User Service', () => {
  let user;

  beforeEach(() => {
    user = createUser(); // Create a fresh user for each test
  });

  afterEach(() => {
    deleteUser(user.id); // Clean up after each test
  });

  it('should create a user', () => {
    expect(user).toBeDefined();
    expect(user.id).toBeTypeOf('string');
  });

  it('should update a user', () => {
    user.name = 'Jane Doe';
    expect(user.name).toBe('Jane Doe');
  });
});
```

## 3. Asynchronous Testing with `vi.waitFor`

**Always use `vi.waitFor` for polling conditions in asynchronous tests.** Avoid arbitrary `setTimeout` calls or manual polling loops. `vi.waitFor` is designed for reliable synchronization.

❌ BAD: (Flaky, relies on arbitrary timeout)
```typescript
test('data loads after delay', async () => {
  let data = null;
  fetchData().then(res => (data = res));
  await new Promise(resolve => setTimeout(resolve, 100)); // Arbitrary wait
  expect(data).toEqual('some data');
});
```

✅ GOOD: (Reliable polling with `vi.waitFor`)
```typescript
import { it, expect, vi } from 'vitest';
import { fetchData } from './api'; // Assume fetchData returns a Promise

it('should load data after delay', async () => {
  let data = null;
  fetchData().then(res => (data = res));

  // Polls until data is not null, with a 2-second timeout
  await vi.waitFor(() => expect(data).not.toBeNull(), { timeout: 2000 });

  expect(data).toEqual('some data');
});
```

## 4. Mocking Strategies

**Leverage Vitest's `vi` API for all mocking.** This provides Jest-compatible syntax and seamless integration. Always clean up mocks after each test.

*   **`vi.fn()`**: Mock individual functions.
*   **`vi.spyOn()`**: Spy on existing object methods.
*   **`vi.mock()`**: Mock entire modules.

### Function Mocking

❌ BAD: (Manual mock, no easy reset)
```typescript
const originalFetch = global.fetch;
global.fetch = () => Promise.resolve({ json: () => ({ id: 1 }) });
// ... test ...
global.fetch = originalFetch; // Easy to forget cleanup
```

✅ GOOD: (Using `vi.fn` with `afterEach` cleanup)
```typescript
import { it, expect, vi, afterEach } from 'vitest';
import { getUser } from './user-api';

// Mock the module containing fetchUser
vi.mock('./user-api', async (importOriginal) => {
  const mod = await importOriginal();
  return {
    ...mod,
    fetchUser: vi.fn(), // Mock specific function within the module
  };
});

// Import the mocked function after vi.mock
import { fetchUser } from './user-api';

afterEach(() => {
  vi.clearAllMocks(); // Clear mock calls after each test to prevent state leakage
});

it('should fetch user data', async () => {
  fetchUser.mockResolvedValueOnce({ id: 1, name: 'Test User' });
  const user = await getUser(1);
  expect(fetchUser).toHaveBeenCalledWith(1);
  expect(user.name).toBe('Test User');
});
```

### Module Mocking

**Mock modules at the top of the file.** This ensures the mock is applied before the module under test imports it.

✅ GOOD: (Module mock before imports)
```typescript
import { vi, it, expect } from 'vitest';

// Mock the entire 'lodash' module to control its behavior
vi.mock('lodash', () => ({
  debounce: vi.fn((fn) => fn), // Mock debounce to execute immediately
}));

import { debounce } from 'lodash'; // Import the mocked debounce
import { saveInput } from './input-handler'; // Module using debounce

it('should call save function without debounce delay', () => {
  saveInput('test');
  expect(debounce).toHaveBeenCalledOnce();
});
```

## 5. DOM Environment & Component Testing

**Use `happy-dom` for lightweight DOM environments.** It's generally faster and sufficient for most component tests. Switch to `jsdom` only if specific browser APIs are missing in `happy-dom`.

*   Configure in `vite.config.ts` or `vitest.config.ts`.

✅ GOOD: (Configuring `happy-dom`)
```typescript
// vite.config.ts or vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom', // Use happy-dom for faster DOM mocking
    globals: true, // Auto-import test APIs globally (e.g., describe, it, expect)
  },
});
```

## 6. Performance & Concurrent Tests

**Utilize `.concurrent` for tests that can run in parallel.** This significantly speeds up test suites where tests are independent.

*   Use `it.concurrent` for individual tests.
*   Use `describe.concurrent` for entire suites.
*   **Important**: When using `.concurrent`, always destructure `expect` from the test context to avoid issues with snapshot and assertion tracking.

❌ BAD: (Sequential tests, slow)
```typescript
describe('My Feature', () => {
  it('test A', async () => { /* ... */ });
  it('test B', async () => { /* ... */ });
});
```

✅ GOOD: (Concurrent tests, faster)
```typescript
import { describe, it } from 'vitest';

describe.concurrent('My Feature', () => {
  it('test A', async ({ expect }) => { // Destructure expect for concurrent tests
    expect(1).toBe(1);
  });

  it.concurrent('test B', async ({ expect }) => { // Destructure expect
    expect(2).toBe(2);
  });
});
```

## 7. Code Coverage

**Enable V8-based code coverage.** It offers near-zero overhead and integrates seamlessly.

*   Add `coverage` configuration to `vite.config.ts` or `vitest.config.ts`.
*   Run with `vitest run --coverage`.

✅ GOOD: (V8 coverage configuration)
```typescript
// vite.config.ts or vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    coverage: {
      provider: 'v8', // Use V8 for native, fast coverage
      reporter: ['text', 'json', 'html'], // Output formats for reports
      exclude: ['node_modules/', 'dist/', '.eslintrc.cjs'], // Exclude common directories from coverage
    },
  },
});
```

---

## 📄 `mdc/zod.mdc`

---
description: This guide outlines definitive best practices for using Zod in TypeScript projects, ensuring robust runtime validation, superior type safety, and maintainable schemas.
globs: **/*.{ts,tsx}
---
# Zod Best Practices

Zod is the definitive TypeScript-first schema validation library. It provides static type inference directly from runtime schemas, catching data-shape errors at both compile time and runtime. Adhere to these guidelines to build resilient, type-safe applications with Zod 4.

## Core Setup & Principles

### 1. Enable Strict TypeScript

Zod's type inference relies on `strict: true` in your `tsconfig.json`. This is non-negotiable for reliable type safety.

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true, // ✅ ALWAYS enable strict mode
    // ...
  }
}
```

### 2. Standardize Zod 4 Adoption

Ensure your project and any Zod-dependent libraries use the modern Zod 4 core.

```json
// package.json
{
  "dependencies": {
    "zod": "^3.25.0 || ^4.0.0" // ✅ Use this peer dependency range
  }
}
```

### 3. Leverage Type Inference (`z.infer`)

Always infer types from your schemas. This eliminates duplication and keeps types synchronized with validation logic.

```typescript
import { z } from 'zod';

const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
});

// ❌ BAD: Manually defining types
interface User {
  id: string;
  name: string;
  email: string;
}

// ✅ GOOD: Infer types directly from the schema
type User = z.infer<typeof userSchema>;

function processUser(user: User) {
  console.log(user.email);
}
```

## Data Validation & Error Handling

### 4. Always Parse Untrusted Data

Never trust external data. Use `schema.parse()` or `schema.safeParse()` immediately upon receiving data from APIs, forms, or environment variables.

```typescript
import { z } from 'zod';

const idSchema = z.string().uuid();

// ❌ BAD: Assuming data is valid
function processId(id: string) {
  // This 'id' could be anything if not validated
  console.log(id.toUpperCase());
}

// ✅ GOOD: Use safeParse for external/untrusted data
function handleRequest(rawId: unknown) {
  const result = idSchema.safeParse(rawId);
  if (!result.success) {
    console.error('Invalid ID received:', result.error.issues);
    return { status: 400, message: 'Invalid ID' };
  }
  // Data is now type-safe and validated
  processId(result.data);
  return { status: 200, message: 'ID processed' };
}

// ✅ GOOD: Use parse for trusted data or when immediate error throwing is desired
function loadConfig(envVar: unknown) {
  try {
    const config = z.object({ API_KEY: z.string().min(1) }).parse(envVar);
    console.log('Config loaded:', config.API_KEY);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Invalid environment config:', error.issues);
      process.exit(1); // Critical error, exit application
    }
    throw error;
  }
}
```

### 5. Customize Error Messages for UX

Provide clear, user-friendly error messages directly within your schemas.

```typescript
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }), // ✅ Custom message
  password: z.string().min(8, { message: 'Password must be at least 8 characters.' }), // ✅ Custom message
});

// Integrate with form libraries (e.g., React Hook Form)
// const { register, handleSubmit, formState: { errors } } = useForm({
//   resolver: zodResolver(loginSchema),
// });
```

## Schema Design & Organization

### 6. Keep Schemas Modular & Domain-Specific

Organize schemas into small, focused files based on their domain. Avoid monolithic schema files.

```
// ❌ BAD: monolithic schemas.ts
// schemas.ts
export const userSchema = z.object({ /* ... */ });
export const productSchema = z.object({ /* ... */ });
export const orderSchema = z.object({ /* ... */ });

// ✅ GOOD: modular, domain-specific files
// schemas/user.schema.ts
export const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
});

// schemas/product.schema.ts
export const productSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(3),
  price: z.number().positive(),
});

// schemas/index.ts (optional re-export)
export * from './user.schema';
export * from './product.schema';
```

### 7. Use Transforms and Refinements for Data Normalization

Normalize and sanitize data as part of validation.

```typescript
import { z } from 'zod';

// ❌ BAD: Manual post-validation processing
const emailInputSchemaBad = z.string().email();
const processEmailBad = (email: string) => email.toLowerCase().trim();

// ✅ GOOD: Integrate transforms directly into the schema
const emailInputSchema = z
  .string()
  .trim() // ✅ Trim whitespace
  .toLowerCase() // ✅ Convert to lowercase
  .email({ message: 'Invalid email address' });

const postIdSchema = z.string().uuid().transform((val) => `post-${val}`); // ✅ Transform data type or format

const passwordSchema = z.string()
  .min(8)
  .refine(val => /[A-Z]/.test(val), { message: 'Password must contain an uppercase letter' }); // ✅ Refine with custom logic
```

### 8. Prefer `z.coerce` for Type Coercion

Use `z.coerce` for explicit type conversion of known string inputs (e.g., from query parameters, environment variables).

```typescript
import { z } from 'zod';

// ❌ BAD: Manual parsing or loose validation
const pageParamBad = z.string(); // Will be '1' not 1
const pageNumberBad = parseInt(pageParamBad.parse('10'));

// ✅ GOOD: Coerce directly in the schema
const querySchema = z.object({
  page: z.coerce.number().int().positive().default(1), // ✅ Coerces '10' to 10
  isActive: z.coerce.boolean().default(false), // ✅ Coerces 'true'/'false' to boolean
});

const { page, isActive } = querySchema.parse({ page: '5', isActive: 'true' });
console.log(page, typeof page); // 5, 'number'
console.log(isActive, typeof isActive); // true, 'boolean'
```

### 9. Differentiate `optional()`, `nullable()`, and `default()`

Understand the nuances for robust schema design.

```typescript
import { z } from 'zod';

const userProfileSchema = z.object({
  username: z.string(),
  // ✅ optional(): field can be present or absent (undefined)
  bio: z.string().optional(),
  // ✅ nullable(): field can be present with a value or null
  website: z.string().url().nullable(),
  // ✅ default(): provides a fallback value if field is undefined
  status: z.enum(['active', 'inactive']).default('active'),
});

type UserProfile = z.infer<typeof userProfileSchema>;
/*
{
  username: string;
  bio?: string | undefined;
  website: string | null;
  status: "active" | "inactive";
}
*/
```

## Testing & Maintenance

### 10. Write Schema-Focused Unit Tests

Thoroughly test your Zod schemas with both valid and invalid data to prevent regressions.

```typescript
// tests/schemas/user.schema.test.ts
import { userSchema } from '../../schemas/user.schema';

describe('userSchema', () => {
  it('should validate a valid user object', () => {
    const validUser = {
      id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
      name: 'John Doe',
      email: 'john.doe@example.com',
    };
    expect(() => userSchema.parse(validUser)).not.toThrow(); // ✅ Validates successfully
  });

  it('should invalidate an invalid email', () => {
    const invalidUser = {
      id: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
      name: 'John Doe',
      email: 'invalid-email',
    };
    const result = userSchema.safeParse(invalidUser);
    expect(result.success).toBe(false); // ✅ Fails validation
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Invalid email'); // ✅ Specific error message
    }
  });
});
```

---

## 📄 `mdc/zustand.mdc`

---
description: Definitive guidelines for using Zustand in React projects, focusing on type safety, modularity, performance, and maintainability with practical code examples.
globs: **/*.{js,jsx}
---
# zustand Best Practices

Zustand is our go-to for global state management due to its minimal API and built-in performance optimizations. This guide outlines the definitive patterns for using Zustand effectively in our projects, ensuring type safety, modularity, and optimal performance.

## 1. Typed Store Shape (TypeScript First)

Always define explicit TypeScript interfaces for your store's state and actions. This provides invaluable type safety and auto-completion across the application, preventing common runtime errors.

❌ BAD: Untyped store, prone to runtime errors
```typescript
import { create } from 'zustand';

const useStore = create((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));
```

✅ GOOD: Fully typed store for robust development
```typescript
import { create } from 'zustand';

interface CounterState {
  count: number;
  increment: () => void;
  decrement: () => void;
}

const useCounterStore = create<CounterState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
}));
```

## 2. Slice-Based Organization

For scalable applications, organize your store into logical "slices" (e.g., `authSlice`, `uiSlice`). This keeps concerns separated, improves readability, and makes testing easier. Compose these slices into a single root store.

`src/store/types.ts`:
```typescript
import { StateCreator } from 'zustand';

// Define individual slice interfaces
export interface AuthSlice {
  user: { id: string; name: string } | null;
  token: string | null;
  login: (user: { id: string; name: string }, token: string) => void;
  logout: () => void;
}

export interface UISlice {
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

// Combine all slice interfaces into the global AppState
export type AppState = AuthSlice & UISlice;

// Type for creating slices that will be composed into AppState
export type AppStateCreator<T> = StateCreator<AppState, [], [], T>;
```

`src/store/slices/createAuthSlice.ts`:
```typescript
import { AppStateCreator, AuthSlice } from '../types';

export const createAuthSlice: AppStateCreator<AuthSlice> = (set) => ({
  user: null,
  token: null,
  login: (user, token) => set({ user, token }),
  logout: () => set({ user: null, token: null }),
});
```

`src/store/slices/createUISlice.ts`:
```typescript
import { AppStateCreator, UISlice } from '../types';

export const createUISlice: AppStateCreator<UISlice> = (set) => ({
  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),
});
```

`src/store/useAppStore.ts`:
```typescript
import { create } from 'zustand';
import { AppState } from './types';
import { createAuthSlice } from './slices/createAuthSlice';
import { createUISlice } from './slices/createUISlice';

export const useAppStore = create<AppState>()((...a) => ({
  ...createAuthSlice(...a),
  ...createUISlice(...a),
}));
```

## 3. Naming Conventions

Follow consistent naming for clarity and discoverability.

*   **Store Hook**: `use[Feature]Store` or `useAppStore` for the root.
*   **Actions**: Verb-oriented (e.g., `increment`, `setUser`, `fetchData`).
*   **Store Files**: Located under `src/store/` or `src/features/[feature]/store.ts`.
*   **Exports**: Only export the custom hook, never the raw `create` object.

❌ BAD: Inconsistent naming, exposing raw store
```typescript
// store.js
export const myStore = create(...); // Exposes raw store
export const useMyStore = myStore; // Bad naming, use `useMyStore` as the primary hook

// component.jsx
myStore.setState({ ... }); // Direct mutation outside hook, bypasses React lifecycle
```

✅ GOOD: Clear, consistent, and encapsulated
```typescript
// src/store/useAppStore.ts
export const useAppStore = create<AppState>(...);

// src/features/auth/useAuthStore.ts (if using feature-specific stores)
export const useAuthStore = create<AuthSlice>(...);

// component.tsx
import { useAppStore } from 'src/store/useAppStore';
const { user, login } = useAppStore();
```

## 4. Functional Updates to Prevent Stale Closures

Always use functional updates (`set(state => ...)`) when an action's new state depends on the current state. This prevents issues with stale closures in asynchronous operations or rapid updates.

❌ BAD: Potential stale closure, especially in async operations
```typescript
const useCounterStore = create<CounterState>((set, get) => ({
  count: 0,
  // ...
  incrementAsync: async () => {
    await someAsyncOperation();
    const currentCount = get().count; // 'currentCount' might be outdated if another update occurred
    set({ count: currentCount + 1 });
  },
}));
```

✅ GOOD: Robust functional update, `state` is always the latest
```typescript
const useCounterStore = create<CounterState>((set) => ({
  count: 0,
  // ...
  incrementAsync: async () => {
    await someAsyncOperation();
    set((state) => ({ count: state.count + 1 }));
  },
}));
```

## 5. Selectors and Shallow Comparison for Performance

Consume only the necessary parts of the state using selectors. For objects or arrays, use `shallow` (or a custom equality function) to prevent unnecessary re-renders when only nested properties change.

❌ BAD: Re-renders component on any state change in the store
```typescript
const MyComponent = () => {
  const { user, token } = useAppStore(); // Re-renders if any part of AppState changes
  // ...
};
```

✅ GOOD: Optimized re-renders with selectors and `shallow`
```typescript
import { shallow } from 'zustand/shallow';
import { useAppStore } from 'src/store/useAppStore';

const UserProfile = () => {
  // Only re-renders if user.name or user.email changes
  const { name, email } = useAppStore(
    (state) => ({ name: state.user?.name, email: state.user?.email }),
    shallow
  );
  // ...
};

const AuthStatus = () => {
  // Only re-renders if token changes
  const token = useAppStore((state) => state.token);
  // ...
};
```

## 6. Essential Middleware Usage

Leverage Zustand's middleware for common concerns like persistence, devtools integration, and immutable updates.

*   **`persist`**: For local storage or IndexedDB. Always provide a `name` and consider `version` for migrations.
*   **`devtools`**: Integrate with Redux DevTools. Enable only in development.
*   **`immer`**: For simplified immutable updates, especially with deeply nested objects.

```typescript
import { create } from 'zustand';
import { persist, devtools, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface SettingsState {
  theme: 'light' | 'dark';
  notifications: { enabled: boolean; sound: boolean };
  setTheme: (theme: 'light' | 'dark') => void;
  toggleNotifications: () => void;
  toggleNotificationSound: () => void;
}

const useSettingsStore = create<SettingsState>()(
  devtools( // Enable devtools for debugging
    persist( // Persist state to storage
      immer((set) => ({ // Use immer for easier immutable updates
        theme: 'light',
        notifications: { enabled: true, sound: true },
        setTheme: (theme) => set({ theme }),
        toggleNotifications: () =>
          set((state) => {
            state.notifications.enabled = !state.notifications.enabled; // Direct mutation with immer
          }),
        toggleNotificationSound: () =>
          set((state) => {
            state.notifications.sound = !state.notifications.sound; // Direct mutation with immer
          }),
      })),
      {
        name: 'app-settings', // Unique name for storage key
        storage: createJSONStorage(() => localStorage), // Choose storage type
        version: 1, // Crucial for future migrations
        partialize: (state) => ({ theme: state.theme }), // Only persist 'theme'
      }
    ),
    { name: 'Settings Store', enabled: process.env.NODE_ENV === 'development' } // Devtools options
  )
);
```

## 7. Initializing Stores Outside Components

Declare your `create` calls at the module level (top of the file) to ensure a single, consistent store instance across your application. Never call `create` inside a React component.

❌ BAD: Creates new store instance on every render
```typescript
const MyComponent = () => {
  // This creates a NEW store instance every time MyComponent re-renders!
  const useLocalStore = create(() => ({ value: 0 }));
  const value = useLocalStore((state) => state.value);
  return <div>{value}</div>;
};
```

✅ GOOD: Single store instance, declared once
```typescript
// At the top of your store file (e.g., src/store/useCounterStore.ts)
const useCounterStore = create<CounterState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));

const MyComponent = () => {
  const count = useCounterStore((state) => state.count);
  return <div>{count}</div>;
};
```

## 8. Asynchronous Actions

Handle asynchronous operations directly within your store actions. Zustand doesn't require special middleware for async, keeping the API simple and direct.

```typescript
interface UserState {
  user: { id: string; name: string } | null;
  loading: boolean;
  error: string | null;
  fetchUser: (userId: string) => Promise<void>;
}

const useUserStore = create<UserState>((set) => ({
  user: null,
  loading: false,
  error: null,
  fetchUser: async (userId) => {
    set({ loading: true, error: null });
    try {
      const response = await fetch(`/api/users/${userId}`);
      if (!response.ok) throw new Error('Failed
