# BPC POS — Complete System Feature Specification

**Project**: Bangladesh Parjatan Corporation (BPC) Multi-Store Point of Sale & ERP System  
**Document**: Master Feature Specification & Technical Capabilities  
**Status**: Production-Ready  
**Format**: GitHub-Flavored Markdown (`.md`)

---

## Table of Contents
1. [Executive Summary](#1-executive-summary)
2. [POS Terminal & Front-Desk Billing Engine](#2-pos-terminal--front-desk-billing-engine)
3. [Automated Time-Period Meal Selection (Dayparting Engine)](#3-automated-time-period-meal-selection-dayparting-engine)
4. [Full End-to-End Bangla (বাংলা) Localization](#4-full-end-to-end-bangla-বাংলা-localization)
5. [Order Management & Lifecycle](#5-order-management--lifecycle)
6. [Inventory, Stock Valuation & Wastage Register](#6-inventory-stock-valuation--wastage-register)
7. [Menu, Category & Dish Engineering](#7-menu-category--dish-engineering)
8. [Multi-Store & Enterprise Branch Architecture](#8-multi-store--enterprise-branch-architecture)
9. [Receipt Design, ESC/POS Hardware & Thermal Printing](#9-receipt-design-escpos-hardware--thermal-printing)
10. [Role-Based Access Control (RBAC) & Security](#10-role-based-access-control-rbac--security)
11. [Sales Analytics, Revenue Reporting & BI](#11-sales-analytics-revenue-reporting--bi)
12. [Expense Tracking & Operational Cash Flow](#12-expense-tracking--operational-cash-flow)
13. [Customer Management (CRM)](#13-customer-management-crm)
14. [Real-time Notifications & Alerts Center](#14-real-time-notifications--alerts-center)
15. [Institutional BPC Branding](#15-institutional-bpc-branding)
16. [Technical Specifications & Architecture](#16-technical-specifications--architecture)

---

## 1. Executive Summary
The **BPC POS** system is a web-based, multi-unit Point of Sale and inventory governance platform tailored for the **Bangladesh Parjatan Corporation (BPC)**. It bridges front-of-house cashier terminals with centralized back-office administration, inventory valuation, multi-branch store controls, government VAT compliance, automated dayparting meal scheduling, full native Bangla localization, and real-time operational auditing.

---

## 2. POS Terminal & Front-Desk Billing Engine
- **Touch-Optimized Menu Grid**: High-contrast, responsive dish catalog with category quick-tabs, visual badges, and instant search in both English and Bangla.
- **Interactive Cart Management**:
  - Real-time line-item addition, quantity increments/decrements, and deletions.
  - Custom line-item preparation notes (e.g., *"Less spicy"*, *"No sugar"*, *"ঝাল কম"*).
  - Automated dynamic pricing with instant tax calculation.
- **Order Types**:
  - **Dine-In (বসে খাওয়া)**
  - **Takeaway / Counter Pickup (পার্সেল)**
  - **Delivery (ডেলিভারি)**
- **Payment Tender Methods**:
  - **Active Operational Method: Cash (নগদ)**
    - For the current operational deployment, **Cash** is the active tender method used by cashiers at POS terminals.
    - Cash tender assistance: Fast input, exact cash shortcuts, change calculation, and bill breakdown.
  - **Digital Payment Infrastructure (Preserved in Codebase)**:
    - Card / SSLCommerz gateway integration and Mobile Financial Services (bKash, Nagad) architecture are preserved in the codebase for phased activation in upcoming digital payment rollouts.
- **Tax & Government VAT Compliance**:
  - Automated store-scoped VAT calculation based on configurable tax percentages.
  - Official VAT registration number stamped on every transaction.
- **Instant Receipt Generation**: Trigger on-screen receipt preview or automatic thermal printing upon payment completion.

---

## 3. Automated Time-Period Meal Selection (Dayparting Engine) & Configurable Meal Times
The POS terminal features an intelligent, automated time-period category selector that dynamically switches menu tabs based on Bangladesh Standard Time (`Asia/Dhaka`):

| Default Time Window | Auto-Selected Meal Section | Bengali Title | Operational Description |
| :--- | :--- | :--- | :--- |
| **05:00 AM – 11:00 AM** | **Breakfast** | **সকালের নাস্তা** | Parathas, eggs, tea, coffee, morning breakfast platters |
| **11:00 AM – 03:00 PM** | **Lunch** | **দুপুরের খাবার** | Rice, curries, fish, beef, chicken, set menus |
| **03:00 PM – 06:00 PM** | **Meal / Snacks** | **মিল / বিকালের খাবার** | Light snacks, lunch-to-evening meals, appetizers, tea |
| **06:00 PM – 05:00 AM** | **Dinner** | **রাতের খাবার** | Dinner specials, grills, biryani, overnight menu |

- **Zero Manual Effort**: Cashiers opening or using the POS during lunch hours automatically land on the Lunch tab; during breakfast, it automatically activates the Breakfast tab.
- **Live Active Period Badge**: Real-time indicator displaying the currently active meal period with live operating hours (e.g. `🟢 ডিনার (18:00 - 05:00)`).
- **Interactive "Set Time" (সময় নির্ধারণ) Button & Modal**:
  - Located directly inside the POS category toolbar for immediate accessibility.
  - Cashiers and managers can adjust Start and End times for **Breakfast**, **Lunch**, **Meal**, and **Dinner** on the fly.
  - Features real-time clock preview, reset defaults option, and instant category tab re-evaluation upon save.
  - Preserved per-store in `localStorage` with global fallback.
- **Full Cashier Flexibility**: Cashiers can override and manually switch to any category tab at any time with a single click.

---

## 4. Full End-to-End Bangla (বাংলা) Localization & Bilingual Data Entry
The POS application provides 100% native dual-language capabilities tailored for Bangladeshi government enterprise environments:
- **Instant Language Switcher**: High-visibility header toggle between **বাংলা (Bengali)** and **English** with immediate reactive re-rendering.
- **Default System Language**: Defaults to **বাংলা (Bangla)** for an authentic local user experience.
- **Bilingual Entry & Display in Dishes and Stock Inventory**:
  - Both Dishes and Stock Item forms include dedicated input fields for **Item Name (English)** and **বাংলা নাম (Bangla Name)**.
  - When Bangla language is active, the system renders the Bangla name (`nameBn`).
  - **Graceful English Fallback**: If a dish or stock item does not have a Bangla name specified, it automatically falls back to the English name, ensuring no missing text or empty placeholders.
- **Bilingual Menu & Catalog**:
  - Dishes and categories store both English (`nameEn`) and Bengali (`nameBn`) names.
  - Full Unicode font rendering preventing any font breakage or character clipping.
- **Bangla Customer Validation**:
  - Customer name input fully supports Bengali script (`^[A-Za-z\u0980-\u09FF.' ]+$`).
  - Bangladeshi mobile number normalization supporting `01XXXXXXXXX`, `+8801XXXXXXXXX`, and `8801XXXXXXXXX`.
- **Bangla Thermal Receipts**:
  - Receipt printing engine supports Bengali item descriptions, Bengali labels, and localized store details.
  - Currency displayed with the official Bangladeshi Taka symbol (**৳**).
  - Timestamps formatted to Asia/Dhaka time with localized date and time formats.
- **Automated Dynamic Translation Cache (`TranslationCache`)**:
  - Database-backed translation caching that dynamically translates ad-hoc items and store content into Bengali to eliminate English leakage.

---

## 5. Order Management & Lifecycle
- **Unified Order Ledger**: Central repository of all historical and active transactions across stores.
- **Order Tracking & Identifiers**:
  - Sequential unique invoice numbers (e.g., `INV-YYYYMMDD-XXXX`).
  - Public receipt security verification codes.
  - Associated cashier and store attribution.
- **Lifecycle Statuses**: `PENDING`, `COMPLETED`, `CANCELLED`, `REFUNDED`.
- **Itemized Breakdown**: View ordered dishes, ingredients, quantities, unit prices, line totals, and print statuses.
- **Manager/Admin Item Return & Refund Governance**:
  - **Strict Permission Gating**: Returning items and order refunds strictly require **Manager** or **Super Admin** authorization across both POS and back-office.
  - **Direct Access for Managers & Super Admins**: Authorized managers and admins can inspect invoice items and execute partial or full returns immediately.
  - **Cashier Override / Approval Workflow**: Unprivileged cashiers attempting an item return are prompted with a Manager/Admin authorization challenge requiring valid manager credentials before the return is confirmed.
  - **POS Counter Integration**: Dedicated "Return Item" (আইটেম ফেরত) button right on the POS category toolbar with instant invoice lookup and live stock restoration.
  - **Financial & Stock Reconciliation**: Returned quantities automatically restock active inventory and adjust ledger totals.
- **Reprinting & Invoicing**: Capability to re-issue fiscal receipts and customer duplicates at any time.

---

## 6. Inventory, Stock Valuation & Wastage Register
- **Dual-Pricing Stock Ledger**:
  - **Buying Price (Cost)**: Unit purchase cost for accurate inventory valuation.
  - **Selling Price (Retail)**: Menu/retail price for direct margin analysis.
  - Real-time stock valuation (`Quantity × Buying Price`) across all inventory lines.
- **Low Stock Thresholds & Alerts**: Configurable reorder points per item triggering automatic alerts when quantities fall below thresholds.
- **Supplier & Procurement Tracking**: Vendor name, procurement reference, and receiving manager attribution.
- **Institutional Perishable & Damaged Return System**:
  - **Official Write-Off Pathways**:
    - 🚚 **Return to Vendor**: Return damaged/expired stock to suppliers with credit notes, cash refunds, or ledger adjustments.
    - 🗑️ **Wastage Write-Off**: Permanent disposal of spoiled, rotten, or transit-damaged items with unrecoverable loss recognition.
  - **Full-Width Standardized Reasons**:
    - Perishable Spoilage / Rotten (পচনশীল অপচয় / নষ্ট)
    - Expired Stock Date (মেয়াদোত্তীর্ণ মালামাল)
    - Damaged in Transit / Storage (সংরক্ষণ বা পরিবহনে ক্ষতিগ্রস্ত)
    - Return to Vendor / Supplier (সরবরাহকারীকে ফেরত)
    - Other Administrative Disposal (অন্যান্য প্রশাসনিক সমন্বয়)
  - **Fast Operational Presets**: Quick 1-click quantity selection buttons (`1`, `5`, `10`, `All`).
  - **Dynamic Financial Valuation & Reconciliation**:
    - Automatic calculation of Total Item Cost Value.
    - 1-click "Full Credit" supplier reimbursement calculation.
    - Real-time Net Financial Loss calculation (`Cost - Vendor Credit`).
  - **Auditable Returns Log**: Filterable historical ledger of all disposals, recorded by user, timestamp, vendor credit, and inspection notes.

---

## 7. Menu, Category & Dish Engineering
- **Multi-Level Classification**:
  - Primary Categories with customizable accent colors, icons, and display ordering.
  - Nested Sub-Categories for deep catalog organization.
- **Dish Profile Management**:
  - Bilingual dish titles (English & Bengali Unicode).
  - Unique SKU tracking.
  - Menu price configuration.
  - Availability toggles (`isAvailable`) and Catalog visibility toggles (`showOnList`).
  - High-definition image uploads.
- **Recipe & Ingredient Linking**: Link menu dishes to raw stock inventory (`DishIngredient` mapping) for automated stock depletion upon order fulfillment.

---

## 8. Multi-Store & Enterprise Branch Architecture
- **Central Branch Switcher**:
  - Global navigation store switcher for Super Admins to monitor **All Stores** or drill down into specific BPC units (Dhaka, Chittagong, Motels, Rest Houses).
  - Automatic store-isolation: Managers are restricted strictly to their assigned unit.
- **Store Profile Customization**:
  - Bilingual unit name (`nameEn` / `nameBn`) and branch code.
  - Physical location and contact details.
  - Store-specific VAT number and tax rates.
  - Dedicated timezone settings (`Asia/Dhaka`).
- **Store-Scoped Auditing**: All stock movements, sales, expenses, and returns are strictly partitioned by store.

---

## 9. Receipt Design, ESC/POS Hardware & Thermal Printing
- **Receipt Customization Engine**:
  - **Paper Width Support**: Standard 58mm and 80mm thermal roll formats.
  - **Visual Themes**: Modern, Classic, Minimalist layouts.
  - **Typography & Colors**: Adjustable font scale, accent colors, and watermark opacity.
  - **Dynamic Header & Footer**: Custom government notices, welcome greetings, and BPC slogans.
  - **Modular Display Toggles**:
    - Show/Hide BPC Top and Bottom Logo
    - Show/Hide Seller & Cashier Details
    - Show/Hide Customer / Buyer Details
    - Show/Hide Order Status & Kitchen Notes
    - Show/Hide Verification QR Codes
    - Show/Hide Official Signatures
- **Hardware Integration**:
  - Support for ESC/POS thermal printers via USB, Network LAN, Serial, and Bluetooth.
  - Terminal device management and real-time connectivity status (`CONNECTED` / `DISCONNECTED`).

---

## 10. Role-Based Access Control (RBAC) & Security
- **Role Hierarchy**:
  - **Super Admin**: Unrestricted national system administration across all branches.
  - **Manager**: Branch-scoped operational administration (POS, Orders, Inventory, Returns, Devices).
- **Single Official Role Badge in UI**:
  - Clean top-left display showing official user role badge (`Super Admin` or `Manager`) with zero duplicate or misleading role titles.
- **Granular Feature Permissions**:
  - Policy enforcement across 13 core modules: `POS`, `ORDERS`, `STOCK`, `CATEGORY`, `SUBCATEGORY`, `DISHES`, `DEVICE_SETTINGS`, `STORE_SETTINGS`, `USERS`, `CUSTOMERS`, `REPORTS`, `EXPENSES`, `NOTIFICATIONS`.
  - Individual per-user permission overrides (`canView` and `canManage`).
- **Authentication & Threat Mitigation**:
  - Encrypted password hashing with Bcrypt.
  - Session lifecycle tracking (`ACTIVE`, `REVOKED`, `EXPIRED`).
  - Brute-force protection: Automatic account lockouts after repeated failed logins (`lockedUntil`).
  - Session metadata tracking (Client IP address, User Agent, Device Name).

---

## 11. Sales Analytics, Revenue Reporting & BI
- **Interactive Multi-Dimensional Sales Dashboard**:
  - **Hourly / Daily Breakdown**: Real-time sales progression for the current operating day.
  - **Weekly Performance**: 7-day comparative sales tracking.
  - **Accumulated Trends**: Long-term revenue overviews.
  - **Shift-Wise Reconciliation**: Cashier and manager shift closure reports.
- **Category & Item Diagnostics**:
  - Best-selling dishes and revenue generators.
  - Sales volume breakdown by category and subcategory.
- **Export & Document Generation**:
  - Clean CSV data exports for auditing and external spreadsheet processing.
  - Direct print-ready HTML report generation with institutional headers.

---

## 12. Expense Tracking & Operational Cash Flow
- **Store Expense Ledger**: Comprehensive logging of operational overheads and petty cash expenditures.
- **Expense Categorization**: Utility, Maintenance, Inventory Sourcing, Kitchen Consumables, Administrative Petty Cash.
- **Metadata Attribution**: Incurred date, amount in BDT (`৳`), authorization notes, and recorded cashier/manager.
- **Net Cash Flow Analysis**: Automated reconciliation of sales revenue against operating expenditures for net store profitability.

---

## 13. Customer Management (CRM)
- **Customer Profiles**: Name, contact phone number, and transaction linkages.
- **Purchase History**: Customer order archives, frequency tracking, and order totals.
- **Government / Corporate Guest Tagging**: Identification of official delegations and repeat corporate clients.

---

## 14. Real-time Notifications & Alerts Center
- **Notification Inbox**: Live badge counter on the top navigation bar with auto-refreshing operational alerts.
- **Notification Classifications**:
  - `ORDER_CREATED`: New order confirmations.
  - `STOCK_LOW`: Warnings when stock drops below safety buffers.
  - `STOCK_OUT`: Critical depletion notifications.
  - `PAYMENT_FAILED`: Transaction discrepancies or failed gateways.
  - `DEVICE_ALERT`: Printer or hardware disconnection alerts.
  - `SECURITY_ALERT`: Suspicious login attempts or account lockouts.
- **Severity Tiers**: `INFO`, `WARNING`, `CRITICAL`.
- **Audience Routing**: Direct broadcast to store staff or Super Admins.

---

## 15. Institutional BPC Branding
- **Official BPC Identity**:
  - Authentic Bangladesh Parjatan Corporation emblem (stylized B-P-C bird motif) embedded in the top-left sidebar header and login screens.
  - Clean brand title **BPC POS** with single official role badge.
  - Clean, professional typography adhering to public-sector digital standards.

---

## 16. Technical Specifications & Architecture

| Layer | Technology |
| :--- | :--- |
| **Framework** | Next.js 15+ (App Router, Server Components & Client Modules) |
| **Language** | JavaScript (ESNext, React 19) |
| **Styling** | Tailwind CSS with responsive layout engine |
| **Database** | PostgreSQL with Prisma ORM |
| **Icons** | Lucide React |
| **Localization** | i18next & react-i18next with bilingual dictionaries |
| **Testing** | Vitest test runner with unit and integration test suites |
| **Security** | Session tokens, bcrypt hashing, store-isolation middleware, policy engines |
| **Hardware** | ESC/POS thermal printer driver integration |

---

*Document updated for official technical review, deployment auditing, and operational handoff.*
