# 📚 BookLeaf Publishing - Author Support & Communication Portal

A full-stack operational portal and author communication system powered by AI-assisted response generation, built for BookLeaf Publishing's technical evaluation.

---

## 🌟 Key Features

### A. Author Portal (Author-Facing)
* **Authentication & RBAC:** Email-based login with JSON Web Tokens (JWT) and role-based access control. Authors only access their own data.
* **My Books Dashboard:** Real-time financial metrics (total copies sold, total royalty earned, royalty paid, royalty pending) and catalog listing with platform availability tags (*Amazon India, Flipkart, BookLeaf Store*).
* **Graceful Production Edge Cases:** Handles unpublished titles (e.g. *Midnight in Mysore* in Cover Design, *Raising Roots* in Typesetting) with clean fallback states for null publication dates and MRP.
* **Submit Support Query:** Form with book selector dropdown (or "General / Account Level"), subject, detailed description, and attachment placeholder.
* **My Tickets & Real-Time Chat:** Split-view timeline with live updates powered by native **Server-Sent Events (SSE)**. Responses from admins reflect instantly without refreshing.

### B. Admin Portal (Operations-Facing)
* **Ticket Queue with Urgency Sorting:** Filterable by status, category, priority, and date. Oldest and `CRITICAL` / `HIGH` unresolved tickets are highlighted and sorted to the top.
* **AI-Powered Auto-Classification:** Incoming queries are automatically categorized into one of 6 domains (*Royalty & Payments, ISBN & Metadata Issues, Printing & Quality, Distribution & Availability, Book Status & Production Updates, General Inquiry*). Admins can manually override if needed.
* **AI Priority Scoring:** Automatic evaluation (`CRITICAL`, `HIGH`, `MEDIUM`, `LOW`) based on content urgency with manual override support.
* **AI-Drafted Responses:** Generates personalized drafts using the **BookLeaf Knowledge Base & Tone Guidelines** and the author's real account financials. Includes a "Copy to Editor & Send" workflow.
* **Confidential Internal Notes:** Private operations notes completely isolated and invisible to the author.
* **Real-time Queue Listener:** Live SSE stream notifies admins of newly created tickets or status changes in real time.

---

## 🛠️ Technology Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend** | React 19 + Vite | Fast rendering, modular component hierarchy, instantaneous HMR. |
| **Styling** | Tailwind CSS v4 | Modern CSS-first `@theme` configuration with zero build baggage. |
| **State Management** | Redux Toolkit | Predictable, centralized state with token persistence in `localStorage`. |
| **Backend** | Node.js + Express (ESM) | Lightweight REST API using native ES Modules (`"type": "module"`). |
| **Database** | PostgreSQL (`node-postgres` `pg`) | Relational integrity, foreign keys, cascades, indexes, and native arrays. |
| **AI / LLM** | Google Gemini API (`@google/genai`) | Free tier via Google AI Studio (`gemini-3.8-flash`) with sub-second latency. |
| **Real-Time** | Server-Sent Events (SSE) | Native browser support via `EventSource`, standard HTTP compatibility, zero proxy friction. |

---

## 📋 Test Login Credentials

Seeded directly from `bookleaf_sample_data.json`:

### 👑 Operations Team (Admin Portal)
* **Email:** `admin@bookleaf.com`
* **Password:** `admin123`

### ✍️ Sample Authors (Author Portal)
* **Email:** `priya.sharma@email.com` (Has published titles with pending royalty)
* **Email:** `sneha.kulkarni@email.com` (Has book *Midnight in Mysore* in production)
* **Email:** `vikram.joshi@email.com` (Self-help author)
* **Email:** `ananya.reddy@email.com` (Historical fiction author)
* **Password:** `password123` *(for all authors)*

*(The login screen also features 1-click test login pills for convenience).*

---

## 🚀 Local Setup Instructions

### Prerequisites
* **Node.js**: v18.x or higher
* **PostgreSQL**: Local database or free cloud instance (e.g. [Neon.tech](https://neon.tech) / Supabase)

### 1. Database Setup
Create a PostgreSQL database named `bookleaf_db`.

### 2. Backend Setup
```bash
cd server

# Install dependencies
npm install

# Configure environment variables in server/.env
# PORT=5000
# DATABASE_URL=postgresql://<user>:<password>@localhost:5432/bookleaf_db
# JWT_SECRET=bookleaf_jwt_super_secret_key_2026_production_grade
# GEMINI_API_KEY=your_gemini_api_key_here

# Initialize PostgreSQL Schema (Tables, Foreign Keys, Indexes)
npm run db:init

# Seed sample dataset (10 authors, 18 books, initial demo tickets)
npm run db:seed

# Start backend server
npm run dev