---
name: react-best-practices
description: "High-impact patterns for React performance and architecture. Focuses on eliminating waterfalls, optimizing bundle size, reducing re-renders, and improving rendering performance. Critical for PWA and mobile experiences."
source: vibeship-spawner-skills (Apache 2.0)
---

# React Best Practices

## 1. Eliminating Waterfalls

**Impact: HIGH (avoids blocking unused code paths)**

### 1.1 Defer Await Until Needed

Move `await` operations into the branches where they're actually used to avoid blocking code paths that don't need them.

**Incorrect: blocks both branches**

```typescript
async function handleRequest(userId: string, skipProcessing: boolean) {
  const userData = await fetchUserData(userId)
  
  if (skipProcessing) {
    return { skipped: true }
  }
  return processUserData(userData)
}
```

**Correct: only blocks when needed**

```typescript
async function handleRequest(userId: string, skipProcessing: boolean) {
  if (skipProcessing) {
    return { skipped: true }
  }
  const userData = await fetchUserData(userId)
  return processUserData(userData)
}
```

### 1.2 Dependency-Based Parallelization

**Impact: CRITICAL (2-10× improvement)**

For operations with partial dependencies, use `Promise.all` or specialized libs to maximize parallelism.

**Incorrect: serial execution**

```typescript
const user = await fetchUser()
const posts = await fetchPosts()
```

**Correct: parallel execution**

```typescript
const [user, posts] = await Promise.all([
  fetchUser(),
  fetchPosts()
])
```

## 2. Bundle Size Optimization

**Impact: CRITICAL (200-800ms import cost, slow builds)**

### 2.1 Avoid Barrel File Imports

Import directly from source files instead of barrel files to avoid loading thousands of unused modules.

**Incorrect: imports entire library**

```tsx
import { Check, X, Menu } from 'lucide-react'
import { Button } from '@mui/material'
```

**Correct: imports only what you need**

```tsx
import Check from 'lucide-react/dist/esm/icons/check'
import Button from '@mui/material/Button'
```

### 2.2 Conditional Module Loading

Load large data or modules only when a feature is activated.

```tsx
useEffect(() => {
  if (enabled) {
    import('./heavy-module.js').then(mod => doSomething(mod))
  }
}, [enabled])
```

### 2.4 Dynamic Imports for Heavy Components

**Impact: CRITICAL (directly affects TTI and LCP)**

Use `React.lazy` or `next/dynamic` to lazy-load large components.

```tsx
const MonacoEditor = lazy(() => import('./monaco-editor'))
```

## 3. Re-render Optimization

**Impact: MEDIUM (avoids unnecessary subscriptions)**

### 3.1 Defer State Reads to Usage Point

Don't subscribe to dynamic state (searchParams, localStorage) if you only read it inside callbacks. Read it *inside* the callback instead.

### 3.2 Extract to Memoized Components

Extract expensive work into memoized components (`React.memo`) to enable early returns before computation.

### 3.3 Narrow Effect Dependencies

Specify primitive dependencies instead of objects to minimize effect re-runs.

**Incorrect:** `useEffect(..., [user])`
**Correct:** `useEffect(..., [user.id])`

### 3.4 Subscribe to Derived State

Subscribe to derived boolean state instead of continuous values.

**Incorrect:** `const width = useWindowWidth()` (updates every pixel)
**Correct:** `const isMobile = useMediaQuery('(max-width: 768px)')` (updates only on breakpoint)

## 4. Rendering Performance

### 4.1 Animate SVG Wrapper Instead of SVG Element

**Impact: LOW (enables hardware acceleration)**

Wrap SVG in a `<div>` and animate the wrapper to use GPU acceleration.

### 4.2 CSS content-visibility for Long Lists

**Impact: HIGH (faster initial render)**

Apply `content-visibility: auto` to defer off-screen rendering.

```css
.item { content-visibility: auto; contain-intrinsic-size: 0 80px; }
```

### 4.3 Hoist Static JSX Elements

Extract static JSX outside components to avoid re-creation on every render.

## 5. Advanced Patterns

### 5.1 Store Event Handlers in Refs

Store callbacks in refs when used in effects that shouldn't re-subscribe on callback changes.

### 5.2 useLatest for Stable Callback Refs

Access latest values in callbacks without adding them to dependency arrays using a `useLatest` hook.
