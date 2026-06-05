## 2026-04-15 - Unintentional breaking of React.memo with inline maps and callbacks
**Learning:** Found a common anti-pattern where components wrapped in `React.memo` (like `DeparturesBoard` and `DepartureRow`) were receiving inline array maps (`favorites.map()`) and inline arrow functions as props. This completely defeated the memoization, causing large tables full of complex components (like `SplitFlapDisplay`) to re-render unnecessarily on minor state changes (like background polling status).
**Action:** Always verify that props passed to memoized components have stable references (using `useMemo` for derived arrays/objects and `useCallback` for functions). Also, check if an existing `memo` is actually working by looking for inline props passed to it.
## 2026-04-19 - Expensive Date formatting in render loops
**Learning:** Calling `new Date().toLocaleTimeString()` or repeatedly creating `new Intl.DateTimeFormat()` objects inside frequently called functions (like render loops for lists of items) is a significant performance bottleneck. Benchmarks show that caching an `Intl.DateTimeFormat` instance at the module level and using its `.format()` method is ~100x faster than calling `Date.toLocaleTimeString` or recreating the formatter.
**Action:** Always cache `Intl.DateTimeFormat` instances at the module scope rather than recreating them during repeated function calls, especially in utility functions that format dates/times for lists or arrays.

## 2026-04-19 - Replaced inline format instances with Intl.DateTimeFormat pattern in components
**Learning:** When moving toLocaleTimeString() and toLocaleDateString() outside of components in render loop into globally cached variables, use Intl.DateTimeFormat pattern. Make sure not to mistakenly assume all files share the exact same configuration as they can vary between formatting sizes like having seconds or not.
**Action:** Use explicitly cached module-level Intl.DateTimeFormat formatting rules locally within file where used, rather than defaulting to exporting them all out of utility if configuration parameters slightly differ.
## 2026-04-20 - Extracting large list rows into React.memo components
**Learning:** In large lists like `DeparturesBoard.tsx`, updating a single piece of state (like `selectedTrip` for a modal) causes the entire list to re-render. If the list items contain complex UI or expensive calculations, this creates significant UI lag (O(N) rendering instead of O(1)).
**Action:** Extract list items (like `<tr>`) into separate components wrapped in `React.memo()` and ensure all passed callback functions (like click handlers) are stabilized using `useCallback` in the parent. This restricts re-rendering only to the items whose props actually change.
## 2026-05-21 - Memoizing Arrays to Sets for Array Sort Lookups
**Learning:** Checking `Array.includes()` repeatedly inside a sort comparator (`O(N log N)` loop) degrades performance to `O(N log N * M)`. This is a hidden bottleneck in list sorting, especially for features like sorting by favorites.
**Action:** Always convert lookup arrays (like `favorites`) into a `Set` inside a `useMemo` block prior to the sort function, enabling O(1) `Set.has()` lookups and restoring sort efficiency to `O(N log N)`.
## 2026-04-25 - Default function arguments and inline arrays breaking React.memo and useMemo
**Learning:** Using `|| []` or default function parameters like `function foo(arr = [])` creates a new array reference on every render when the value is undefined (e.g., during loading states). When these arrays are passed into `useMemo` dependencies or `React.memo` components, they completely defeat memoization and cause the entire component tree to re-render unnecessarily.
**Action:** Always use stable module-level constants (e.g., `const EMPTY_ARRAY = []`) for fallback values and default parameters when they will be used in dependency arrays or passed to memoized components.
## 2026-04-24 - Avoid O(N^2) origin checks in merged arrays
**Learning:** In hooks like `useDelayNotifications`, concatenating multiple arrays (`[...departures, ...arrivals]`) into a single `allEntries` array, and then using `.includes()` on the original arrays to determine the item's origin type inside the loop (`departures.includes(entry)`) creates an O(N^2) complexity bottleneck.
**Action:** Process distinct arrays separately (e.g., separate `forEach` loops for `departures` and `arrivals`) rather than concatenating them. This eliminates the need for expensive origin checks inside the iteration and reduces memory overhead from array creation.
## 2026-05-21 - Avoiding O(N) Set Recreations Inside Map Loops
**Learning:** Found an anti-pattern where a `Set` was being instantiated inside an `.map()` iteration over an array. For an array of size N, this meant the `Set` was allocated and populated N times, resulting in massive unnecessary memory overhead and degrading an O(N) mapping operation to essentially O(N*M) where M is the size of the set.
**Action:** Always verify that complex data structures like `Set` or `Map` used for lookups inside loops are declared and instantiated *outside* the loop (or memoized in React components) to ensure they are created exactly once.

## 2026-05-21 - Overusing Map/Set/Sort for Finding Extrema
**Learning:** In a codebase, finding the maximum date string among 5,000+ entries was implemented using `[...new Set(schedule.map(item => item.date))].sort()`. This created a large intermediate array, deduplicated it into a Set, created another array, and applied an expensive O(N log N) sort just to grab the last element.
**Action:** Replace expensive chaining (map + Set + sort) with a simple O(N) linear scan (e.g., using a basic `for` loop or `.reduce()`) when searching for maximums or minimums, especially on large datasets.
## 2026-05-21 - Avoid O(N) Set Recreations inside Function Calls
**Learning:** Found an anti-pattern where a `Set` was being instantiated inside `findStopUpdate` and `getBusData`, both of which are called frequently (either per stop or per API request). This results in unnecessary O(N) memory allocations and GC pressure every time the functions are invoked.
**Action:** Move Set definitions to the module scope and populate them using lazily loaded cache blocks or simply as constant definitions outside function scope to achieve O(1) performance and avoid recreation inside loops or API route handlers.
## 2026-05-21 - Avoiding Array.includes() and filter() inside useMemo loops
**Learning:** Found an anti-pattern in `src/app/app/page.tsx` and `src/app/app/arrivees/page.tsx` where stats were being calculated using multiple `.filter()` calls, one of which used `favoriteIds.includes(d.id)`. This caused O(N) intermediate array creations and O(N*M) lookups inside a `useMemo` block that runs on every data update.
**Action:** Replace multiple `.filter()` calls with a single loop and use a `Set` for O(1) lookups instead of `Array.includes()`. This avoids intermediate array allocations and reduces time complexity from O(N*M) to O(N).

## 2026-05-05 - Avoid chained array operations in React memo blocks
**Learning:** Chained array operations like `.filter(...).filter(...)` or `.filter(...).map(...)` inside `useMemo` hooks cause intermediate array allocations on every render. This creates unnecessary garbage collection overhead.
**Action:** Always combine conditions into a single `.filter()` pass or use a `for...of` loop when multiple transformations are needed in a single render pass.
## 2026-05-03 - Avoiding redundant filter() calls for simple stats calculation
**Learning:** Found an anti-pattern in `src/app/app/carte/page.tsx` where multiple `.filter().length` calls were chained sequentially on the same array to compute counts for different booleans (`isRealtime`). This leads to unnecessary O(N) array allocations and degrades performance when dealing with large datasets.
**Action:** Replace multiple `.filter()` calls with a single O(N) `for...of` loop that calculates all necessary statistics in one pass without creating intermediate array references.

## 2026-05-21 - Eliminating Chained Array Allocations in API Routes
**Learning:** Found an anti-pattern in `src/services/bus.service.ts` where generating the `combinedUpdates` array involved a chain of `.filter().map().filter()` calls, and determining the final `nextBuses` involved a `.filter().slice()` chain. For datasets like upcoming schedules, these create multiple large intermediate arrays that cause unnecessary GC pressure and latency on API routes or SSE event loops.
**Action:** Replace chained `.filter().map()` loops with a single `for...of` loop and use early `continue` or `break` statements. This consolidates data processing, avoids intermediate array allocations, and speeds up computation.

## 2026-05-21 - O(N^2) Anti-Pattern in Array Filtering Methods
**Learning:** Found an `O(N*M)` complexity bug where `array.find()` was being used inside an `array.forEach()` over potentially hundreds of elements (in `removeCancelledTripsWithReplacement`). While `Array.find()` feels clean, inside a loop it degrades performance dramatically.
**Action:** Always pre-group or index secondary arrays (e.g. by direction) before comparing them inside loops, and use `.some()` instead of `.find()` if you only need boolean existence to short-circuit the inner loop faster.
## 2026-05-12 - Avoiding redundant filter() calls for simple stats calculation
**Learning:** Found an anti-pattern in `src/app/api/vehicles/route.ts` where multiple `.filter().length` calls were chained sequentially on the same array to compute counts for different sources (`gps`, `realtime_interpolated`, `static`). This leads to unnecessary O(N) array allocations and degrades performance when dealing with large datasets on an API route.
**Action:** Replace multiple `.filter()` calls with a single O(N) `for...of` loop that calculates all necessary statistics in one pass without creating intermediate array references.
## 2026-05-21 - O(N*M) Anti-Pattern in Intl.DateTimeFormat extraction
**Learning:** Found an O(N*M) complexity bug where `parts.find()` was being used repeatedly to extract different parts from the array returned by `Intl.DateTimeFormat.prototype.formatToParts()`. This results in scanning the parts array multiple times.
**Action:** Replace multiple `.find()` calls on the same array with a single pass `for...of` loop to extract all necessary values simultaneously, reducing complexity to O(N).
## 2026-05-21 - Fix O(N*M) lookup anti-pattern in TransitBoardPage
**Learning:** In React components with frequent state updates (like `filteredEntries` changing), checking `array.some(id => id === item.id)` inside a loop over a large array (`departures`) creates an O(N * M) performance bottleneck on every render.
**Action:** Use `useMemo` to convert arrays of lookup IDs (like `favorites`) into a `Set` and use `set.has()` instead, converting the lookup operation from O(M) to O(1), making the total loop O(N).
## 2026-05-29 - O(N) Anti-Pattern in Array Filtering Methods
**Learning:** Found an `O(N)` complexity bug where `array.find()` was being used immediately after `array.findIndex()` (in `TripTimeline.tsx`). This resulted in an unnecessary second iteration over the array.
**Action:** Always use direct array index access (`array[index]`) after a `.findIndex()` to improve performance to `O(1)`. When utilizing direct array index access after a `.findIndex()`, `eslint-plugin-security` may flag it with a `security/detect-object-injection` warning. This can be safely resolved by locally adding `// eslint-disable-next-line security/detect-object-injection` before the assignment if the index is trusted.
## 2025-06-04 - Set Object Memory Leak Pattern
**Learning:** Found a memory anti-pattern where a `Set` object was recreated from an array on every render. Even though `useMemo` was used, `useMemo` depends on object reference equality. Since the parent passed an array prop (`favorites`) that was created dynamically in `TransitBoardPage.tsx` using `favorites.map(f => f.id)`, it triggered unnecessary recalculations in `useMemo` hooks of child components (`DeparturesList`, `DeparturesBoard`) which generated unecessary intermediate objects creating extra work for garbage collection and potential stuttering in React render loops. Also, O(N) recreations coupled with `array.includes` O(M) lookup in tight loop mappings or sorting creates O(N * M) performance degradation.

**Action:** Pass pre-computed `Set` objects directly through React props rather than strings array. Replace `favorites.map` and `new Set` chains with a single unified `for...of` loop inside a `useMemo` hooked to a stable state dependency. Make sure to define stable default parameters module-level constants (e.g. `const EMPTY_SET = new Set()`) instead of fallback logic (`favorites = []`) inside component parameters which breaks reference stability.

## 2026-05-30 - Eliminating Array Allocation for Map Instantiation
**Learning:** Initializing Maps using `new Map(array.map(...))` creates an intermediate array containing exactly the same number of elements as the original array, just formatted as `[key, value]` tuples. For datasets of hundreds of elements, this causes unnecessary garbage collection and memory overhead.
**Action:** Replace `new Map(array.map(...))` with a simple `for` loop, instantiating the Map empty and using `Map.set()` directly. This avoids intermediate array allocations and provides measurable memory efficiency improvements.

## 2026-05-29 - O(N) Anti-Pattern: Recreating Arrays for find() in Hot Loops
**Learning:** Found an anti-pattern in `findRelevantStopUpdate` where a new array was dynamically allocated on every call (`[stopGroups.champfleuri, stopGroups.patural]`) just to execute an inline `.find()` with `.includes()`. Since this function is called inside nested loops for every stop and trip, the unnecessary O(N) array allocation and arrow function creation created significant memory pressure and CPU overhead.
**Action:** Replace dynamic array creation and `find()` callbacks on hot paths with explicit `if/else` block checks and `.includes()` directly on the pre-existing arrays. This avoids memory allocation overhead and reduces function invocations.
