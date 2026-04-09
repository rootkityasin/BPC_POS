

| 90S LABS SOFTWARE REQUIREMENTS SPECIFICATION ──────────────────────────────────── Multi-Store Point of Sale (POS) System |
| ----- |
| **DOCUMENT INFORMATION** **Version** 1.0 — Initial Release **Prepared By** 90s Labs **Date** April 2026 **Status** Draft — For Review **Classification** Confidential  |
|  *Proprietary & Confidential — Not for Distribution* © 2026 90s Labs. All rights reserved. |

re

# **1\. Introduction**

## **1.1  Purpose**

This Software Requirements Specification (SRS) defines the functional and non-functional requirements for a web-based, multi-store Point of Sale system. It serves as the master reference for development, QA, and stakeholder alignment.

## **1.2  Scope**

The system covers: POS terminal, centralized admin panel, real-time analytics, offline-first operation, bilingual UI (Bangla/English), hardware integration (thermal printers), and payment gateways (bKash, Nagad, SSLCommerz).

## **1.3  Key Definitions**

| Term | Meaning |
| :---- | :---- |
| POS | Point of Sale — transaction terminal |
| PWA | Progressive Web App — installable, offline-capable web app |
| MFS | Mobile Financial Service (bKash, Nagad) |
| RBAC | Role-Based Access Control |
| BDT | Bangladeshi Taka — primary currency |
| IndexedDB | Browser database for offline data storage |
| SW | Service Worker — enables offline caching |
| SKU | Stock Keeping Unit — unique product identifier |
| JWT | JSON Web Token — used for secure authentication |

## **1.4  Operating Environment**

* Browser: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

* Devices: Desktop computers, tablets, touch-screen POS terminals

* Connectivity: Full online and full offline; auto-sync on reconnect

* Hosting: Cloud-hosted backend (AWS / DigitalOcean)

* Hardware: ESC/POS thermal printers via USB, LAN, or Bluetooth

## **1.5  Constraints & Assumptions**

* System must operate offline for at least 72 hours using local IndexedDB storage

* All UI text available in Bangla and English; Bangla Unicode rendering required

* Payment integrations must comply with Bangladesh Bank regulations

* No desktop software installation required — runs entirely in the browser

# **2\. Stakeholders & Roles**

## **2.1  Role Hierarchy**

| Role | Scope | Key Responsibilities |
| :---- | :---- | :---- |
| Super Admin | All stores | Full system access — config, billing, all stores |
| Store Admin | Own store(s) | Products, staff, config, reports |
| Manager | One store | Daily ops, order overrides, reports |
| Cashier | POS terminal | Order entry, payment, basic history |

## **2.2  Permission Matrix**

| Feature | Super Admin | Manager |
| :---- | :---- | :---- |
| Manage stores / config | ✓ | — |
| Manage products & menu | ✓ | Limited |
| Process orders | ✓ | ✓ |
| Apply discounts | ✓ | ✓ |
| Void / refund | ✓ | ✓ |
| View reports & export | ✓ | ✓ |
| Manage staff | ✓ | Limited |

# **3\. Functional Requirements**

## **3.1  Authentication & Session Management**

* JWT-based login (email \+ password) with 8-hour session and refresh tokens

* Device-level PIN for quick POS re-authentication after idle

* Account lockout after 5 failed attempts; force-logout from admin panel

* MFA optional for admin accounts; admin can view all active sessions per user

## **3.2  POS Terminal — Order Entry**

### **Interface & Cart**

* Category tabs with icons and color coding; real-time search (Bangla \+ English)

* Quick add-to-cart; quantity adjustment and special notes per line item

* Hold and resume orders; park order to a table and recall from any terminal

* Merge two open orders; split one order by seat, item, or amount

### **Modifiers & Variants**

* Modifier groups per product (e.g. Size, Spice Level, Add-ons)

* Required or optional groups; min/max selection rules; additional price per variant

## **3.3  Product & Menu Management**

### **Product Catalog**

* Products: name (EN \+ BN), description, image, SKU, barcode, tags, archive flag

* Categories and sub-categories with icon, color, and display order

* Combos: bundle multiple items at a fixed or computed price

* Pricing: base price with store-level overrides; VAT inclusive or exclusive

* Bulk CSV import/export; duplicate product shortcut

### **Scheduled / Time-Based Menus**

* Admin defines named time slots (Breakfast / Lunch / Dinner / custom) with start and end times

* Categories and items assigned to time slots; POS auto-loads the correct menu based on current time

* Manager can manually override the active time slot when needed

### **Stock & Availability**

* Instant out-of-stock or hidden toggle from POS or admin panel

* Optional ingredient-level stock tracking with auto-deduction on sale

* Low-stock alerts at configurable thresholds; adjustment entries logged with reason

## **3.4  Billing & Payment**

### **Invoice & Discounts**

* Auto-generate invoice on order confirmation with configurable prefix \+ date \+ sequence number

* Invoice shows: store logo, address, items, quantities, unit prices, discounts, tax, total

* Digital invoice available as on-screen display, PDF, email, or WhatsApp share

* Discounts: flat amount or percentage, applied per item or per order

* Promo codes: single/multi-use, expiry date, manager approval above configurable threshold

### **Payment Methods**

| Method | Type | Details |
| :---- | :---- | :---- |
| Cash | Physical | Manual entry; auto-calculates change from denomination entered |
| bKash | MFS | bKash Payment API — QR or number-based; webhook status update |
| Nagad | MFS | Nagad API — QR or number-based; webhook callback |
| Card / Bank | Gateway | SSLCommerz — Visa, Mastercard, bank transfer, EMI |
| Split | Mixed | Any combination of above methods for a single order |
| Partial | Any | Collect partial amount now; remainder as tab or credit |

### **Refunds & Voids**

* Full or partial void before payment (requires manager permission)

* Full or partial refund after payment with reason and authorization

* Refund to original payment method or as store credit; all voids retained in reports

## **3.5  Multi-Store Management**

* Unlimited stores under one account; each with own logo, tax config, and operating hours

* Centralized product catalog with store-level price and availability overrides

* Store performance comparison in analytics; inter-store stock transfer with approval workflow

## **3.6  Admin Dashboard & Analytics**

### **Real-Time Dashboard**

* Live counters: order count, revenue, average order value vs. yesterday and last week

* Active cashier sessions with transaction counts; live payment method breakdown

### **Reports**

| Report | Period Options | Export |
| :---- | :---- | :---- |
| Sales Summary | Daily, Weekly, Monthly, Custom | CSV, Excel, PDF |
| Itemized Sales | Any period | CSV, Excel |
| Payment Method Breakdown | Any period | CSV, Excel |
| Top-Selling Items | Any period | CSV, Excel |
| Discount & Promo | Any period | CSV, Excel |
| Refund / Void | Any period | CSV, Excel |
| Tax / VAT | Monthly | CSV, Excel, PDF |

* Basic profit estimation: selling price vs. cost price; COGS from sales data

## **3.7  Multi-Language Support**

* Full UI in English and Bangla; language toggle in top navigation bar

* Default language configurable per user account and per terminal/device

* Product names, descriptions, and categories each have EN and BN fields

* Receipts print in the language selected by the cashier at time of printing

* Bangla Unicode fonts embedded; no dependency on system-installed fonts

## **3.8  Offline Mode & Data Sync**

* All POS functions available without internet: order entry, cash payment, printing

* Product catalog and configuration cached via Service Worker; orders stored in IndexedDB

* Auto-sync within 3 seconds of reconnection; queue processes in chronological order

* Conflict resolution: server timestamp wins for inventory; client wins for new orders

* Failed syncs retry with exponential backoff; sync status visible to admin

* Daily cloud backup; manual export (JSON / CSV); 30-day point-in-time restore

# **4\. Non-Functional Requirements**

## **4.1  Performance**

| Metric | Target |
| :---- | :---- |
| POS page initial load | \< 2 s on 4G connection |
| Product search (up to 10K items) | \< 300 ms |
| Order submission to server | \< 1 s end-to-end (online) |
| Offline PWA startup from cache | \< 3 s |
| Report generation (30-day range) | \< 10 s |
| Concurrent terminals per store | ≥ 20 simultaneous sessions |
| Total concurrent users | ≥ 500 across all stores |

## **4.2  Reliability & Availability**

* System uptime SLA: 99.9% (less than 8.7 hours downtime per year)

* Offline mode ensures zero loss of sales transactions during outages

* Automated failover for database (primary / replica architecture)

* Zero data loss guarantee for all committed transactions

## **4.3  Security**

* All connections enforced over HTTPS (TLS 1.2+); JWT bearer token authentication

* RBAC enforced at API level — not only in the UI

* Passwords stored using bcrypt (minimum 12 rounds); no raw card data stored

* SQL injection and XSS prevention via parameterized queries and CSP headers

* Rate limiting on auth endpoints; AES-256 encryption at rest for sensitive fields

* All admin actions logged in an immutable, append-only audit trail

## **4.4  Usability & Accessibility**

* Standard order completed by cashier in under 60 seconds

* New cashier self-sufficient after 30-minute onboarding session

* All touch targets minimum 44×44 px; WCAG 2.1 Level AA color contrast compliance

* Error messages are descriptive and actionable — no generic error strings

## **4.5  Scalability & Maintainability**

* Horizontal scaling via Docker / Kubernetes; read replicas for analytics queries

* Architecture supports 1,000+ stores without code changes

* API versioned (/api/v1/); minimum 80% unit test coverage for business logic

* CI/CD pipeline with automated test gates; feature flags for gradual rollout

# **5\. System Architecture**

## **5.1  Technology Stack**

| Layer | Technology | Rationale |
| :---- | :---- | :---- |
| Frontend | [Next.js](http://Next.js) (JavaScript) | SSR, PWA support, excellent DX |
|  |  |  |
| Offline DB | IndexedDB via Dexie.js | Structured local storage, large capacity |
|  |  |  |
| Backend | [Next.js](http://Next.js) | Modular, scalable, enterprise-ready |
| API | REST \+ WebSocket (Socket.io) | REST for CRUD; WebSocket for real-time |
| Database | PostgreSQL | ACID compliance, relational integrity |
| Cache / PubSub | Valkey | Real-time sync, session cache |
| File Storage | minio/ cloudflare r2 him | Product images, PDFs, exports |
| Auth | JWT \+ Refresh Tokens | Stateless, scalable, offline-compatible |
| Container | Docker \+ Docker Compose | Consistent dev and prod environments |

## **5.2  Data Flow — Online Order**

* Cashier selects product → cart updated in Zustand → POST /api/v1/orders

* NestJS validates order, writes to PostgreSQL, publishes event to Redis channel

* Socket.io broadcasts to relevant store terminals in real time

* Payment webhook callback received → order status updated → broadcast to POS

## **5.3  Data Flow — Offline Order**

* Internet lost → offline indicator shown → full POS functionality retained

* Order saved to IndexedDB with status: pending\_sync

* On reconnect: sync queue processes in FIFO order → server confirms receipt

* Conflict resolution applied; new orders always accepted from client timestamp

# **6\. External Interface Requirements**

## **6.1  Payment Gateways**

| Gateway | Auth Type | Key Operations |
| :---- | :---- | :---- |
| bKash | OAuth 2.0 | Create payment, execute, query status, refund |
| Nagad | Signature-based | Create payment, callback verification, refund |
| SSLCommerz | API Key \+ IPN | Card, EMI, bank transfer, refund, IPN webhook |

## **6.2  Hardware Interfaces**

| Hardware | Protocol | Integration Method |
| :---- | :---- | :---- |
| Thermal Printer (USB) | ESC/POS | Web USB API (Chrome) or local print server |
| Thermal Printer (LAN) | ESC/POS over TCP | Node.js print service on local network |
| Thermal Printer (BT) | ESC/POS over BT | Web Bluetooth API (Chrome / Android) |
| Barcode Scanner | HID keyboard | Direct input capture — no driver required |
| Cash Drawer | Via printer | ESC/POS kick-drawer command |

## **6.3  API Design Standards**

* RESTful API following OpenAPI 3.0 specification; all responses in JSON

* Standard envelope: { success, data, error, meta } on every response

* HTTP status codes used correctly (200, 201, 400, 401, 403, 404, 409, 500\)

* Pagination on all list endpoints: page, limit, total, hasNext

* Webhook callbacks use HMAC signature verification for security

# **7\. Requirements Traceability Matrix**

| ID | Requirement | Priority | Module |
| :---- | :---- | :---- | :---- |
| FR-001 | JWT authentication & session management | Must Have | Auth |
| FR-002 | Role-based access control (4 roles) | Must Have | Auth / Admin |
| FR-005 | Product modifiers and variants | Must Have | Product Mgmt |
| FR-006 | Time-based scheduled menus | Must Have | Product Mgmt |
| FR-008 | Split / merge orders | Should Have | POS |
| FR-009 | Discount and promo code system | Must Have | Billing |
| FR-010 | Cash payment with change calculation | Must Have | Payment |
| FR-011 | bKash payment integration | Must Have | Payment |
| FR-012 | Nagad payment integration | Must Have | Payment |
| FR-013 | SSLCommerz (card) payment integration | Should Have | Payment |
| FR-014 | Auto invoice generation and printing | Must Have | Billing |
| FR-015 | Thermal printer support (USB / LAN / BT) | Must Have | Hardware |
| FR-016 | Offline mode — IndexedDB local storage | Must Have | Offline |
| FR-017 | Auto-sync on reconnection with conflict resolve | Must Have | Offline |
| FR-018 | Bangla \+ English bilingual UI | Must Have | i18n |
| FR-020 | Multi-store management | Must Have | Admin |
| FR-021 | Real-time analytics dashboard | Must Have | Analytics |
| FR-022 | Report export (CSV / Excel) | Must Have | Analytics |
| NFR-001 | POS load \< 2 s on 4G; ≥ 500 concurrent users | Must Have | Performance |
| NFR-002 | 99.9% uptime; zero transaction data loss | Must Have | Reliability |
| NFR-003 | HTTPS, JWT, RBAC, AES-256 encryption at rest | Must Have | Security |

## **Priority Legend**

| Priority | Definition |
| :---- | :---- |
| Must Have | System cannot ship without this — core functionality |
| Should Have | Important for full product value but not launch-blocking |

*End of Document  —  SRS v1.0  |  90s Labs  |  April 2026  |  Confidential*