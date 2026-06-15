# Salesforce GraphQL Cursor Pagination Prototype

A lightweight, high-performance vanilla JavaScript proof-of-concept demonstrating arbitrary page-jumping and smooth backward/forward navigation using Salesforce's cursor-based GraphQL API layout.

---

## The Problem

Modern web interfaces frequently require dynamic pagination actions, including:
- Navigating sequentially (**Next** / **Previous**).
- Jumping directly to an **arbitrary page number** (e.g., jumping from Page 1 straight to Page 4).
- Changing records displayed per page dynamically.

However, the **Salesforce GraphQL UI API strictly utilizes cursor-based pagination** (`after` and `first` configurations). It does not natively support traditional database offsets (e.g., "skip 20 rows"). To jump to Page 4, the API architecturally requires the unique token (cursor) generated at the end of Page 3. 

UI teams often attempt to solve this by building heavy client-side data-caching layers or persisting massive state across user sessions. This introduces significant complexity around cursor lifecycle management, stale caches, and synchronization bugs whenever filters, sort orders, or page sizes change.

---

## The Solution: The Cursor Stack Architecture

This project proves that you can deliver a complete, multi-action pagination experience **without heavy data caching or complex state frameworks**. 

Instead of caching bulky Salesforce records, this application implements a lightweight **Cursor Stack** memory map (`pageCursors`) that stores only individual text-string pointer tokens.

### How It Works under the Hood:
1. **Initial State:** The stack initialized with Page 1 mapping to `null` (the beginning of the database).
2. **The "Fast-Forward" Loop:** If a user uses the dropdown interface to jump directly to an unvisited page (like Page 4), the JavaScript engine detects that the cursor is missing. It instantly triggers rapid, silent background network calls to sequentially harvest the intermediate cursors for Pages 2 and 3.
3. **Seamless Rendering:** Once the target cursor is fetched, the actual data for Page 4 is pulled and rendered.
4. **Instant Cache Reset:** If a user alters the page size or updates search filters, the entire state mechanism simply wipes the cursor map back to `{ 1: null }` and resets to Page 1 instantly, eliminating the risk of stale cache synchronization errors.

### Additional Features:
- **Continuous Serial Numbering:** Automatically calculates and displays perfect row counters ($1 \dots 5$, $6 \dots 10$, $11 \dots 15$) across pages entirely via local UI mathematics, bypasssing database limitations.
- **Dynamic Status Badges:** Maps raw Salesforce status text inputs directly into modern, clean CSS pill tiles (e.g., Yellow for *In Progress*, Blue for *New*).
- **Network Efficiency:** Keeps payloads entirely fixed at the exact page size specified, maximizing performance.

---

## 🛠️ Local Setup Instructions

1. Clone or download this repository to your local machine.
2. Open `app.js` and input your active Salesforce Sandbox session token into the `AUTH_TOKEN` variable string.
3. Because browsers block cross-origin requests (`CORS`) originating from raw local files, serve the directory using a local environment link (such as the **Live Server** extension in VS Code).
4. Ensure your Salesforce Sandbox CORS settings authorize your local origin endpoint:
   ```text
   http://localhost:5500
