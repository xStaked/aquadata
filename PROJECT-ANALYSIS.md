# Project Analysis: AquaData - Aquaculture Platform MVP

## 🎯 Core Purpose

A comprehensive digital aquaculture management platform built for fish farm operators in Colombia. Centralizes farm operations, production tracking, analytics, cost management, and AI-assisted tools for aquaculture businesses.

---

## 🏗️ Architecture

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) + React 19 |
| **Language** | TypeScript (strict mode) |
| **Styling** | Tailwind CSS 3 + shadcn/ui components |
| **Database** | Supabase (PostgreSQL with Row-Level Security) |
| **AI/ML** | Vercel AI SDK - Google Gemini (OCR) + DeepSeek (bioremediation chat) |
| **Forms** | React Hook Form + Zod validation |
| **Charts** | Recharts |
| **Drag & Drop** | @dnd-kit |
| **Package Manager** | pnpm |
| **Node Version** | 20+ |

---

## 📊 Key Features

### 1. Authentication & Roles
- Admin/operario role-based access control
- Invitation-code-gated signup
- Phone number registration (Colombian +57)
- Supabase Auth with organization-based access

### 2. Operational Dashboard
- KPIs (ponds, active batches, records, open alerts)
- Operational health score
- Quick action shortcuts

### 3. Pond & Batch Management
- Track ponds (area, depth, species)
- Production batch lifecycle management
- Drag-and-drop sortable pond grid

### 4. Production Records
- Feed, mortality, biomass tracking
- Water quality parameters (temperature, oxygen, ammonia, nitrites, nitrates, pH, phosphates, hardness, alkalinity)
- Automatic FCA (Feed Conversion Ratio) calculation

### 5. OCR Upload
- AI extracts structured data from field report photos
- Gemini vision models with fallback chain
- Per-field confidence scores

### 6. Bioremediation Tools
- Pond volume and treatment dose calculator
- AI chat assistant (DeepSeek) for contextualized recommendations
- Case library with approved treatments
- User feedback on AI responses

### 7. Cost & Sales Management
- Feed costs, fingerling costs, labor tracking
- Harvest records and projected revenue
- Profitability percentage calculations
- Market price references

### 8. Market Prices
- Colombian fish market data (SIPSA/DANE)
- Species: tilapia, mojarra, cachama, trucha, etc.
- City-based pricing
- One-click sync functionality

### 9. Alerts System
- Automatic water quality issue detection
- High ammonia, low oxygen alerts
- Alert center with management tools

### 10. Admin Module
- Multi-organization oversight
- Producer and farm management
- Invitation code management
- Product catalog administration
- Bioremediation case library
- Cross-organization analytics

---

## 🗄️ Database Structure

14+ SQL migrations managing:

### Core Entities
- `organizations` - Farm/company records
- `profiles` - User profiles with roles (admin/operario)
- `ponds` - Fish ponds with specifications
- `batches` - Production cycles per pond
- `production_records` - Daily operational data
- `uploads` - OCR upload tracking

### Additional Tables
- `market_prices` - Reference fish prices by species/city
- `feed_concentrates` - Feed product catalog
- `monthly_feed_records` - Monthly feed usage
- `harvest_records` - Harvest events
- `alerts` - System-generated alerts
- `invitation_codes` - Gated registration codes
- `bioremediation_cases` - Approved treatment case library
- `bioremediation_chat_sessions` + `messages` - Chat history
- `chat_message_feedback` - User feedback on AI responses
- `admin_products` - Admin product catalog

### Security
- Row-Level Security (RLS) on all tables
- Role-based access control via `is_admin()` function
- Organization-level data isolation
- Auto-profile creation trigger on user signup

---

## 📁 Key Directories

| Directory | Purpose |
|-----------|---------|
| `app/` | Pages, layouts, API routes (App Router) |
| `components/` | UI features + shadcn primitives |
| `lib/` | Supabase, AI providers, FCA calculator, bioremediation services |
| `scripts/` | SQL migrations and seed data |
| `hooks/` | Reusable React hooks |
| `public/` | Static assets |
| `styles/` | Global styles |

---

## 🔐 Security & Configuration

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000/dashboard
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_CHAT_MODEL=deepseek-chat
```

### Security Features
- Supabase Auth with cookie-based sessions
- Row-Level Security policies
- Role-based route protection
- Environment secrets in `.env.local` (gitignored)
- No service-role keys exposed client-side

---

## 🚀 Development Commands

```bash
pnpm install          # Install dependencies
pnpm dev              # Start local development server
pnpm build            # Production build with type checking
pnpm start            # Run production build locally
pnpm lint             # Run ESLint
```

---

## 📈 Current State

**Production-ready MVP** with:
- ✅ Full CRUD operations for all entities
- ✅ AI-powered OCR and chat assistants
- ✅ Colombian market data integration
- ✅ Comprehensive financial tracking
- ✅ Admin oversight capabilities
- ✅ Responsive design with mobile support
- ✅ Proper separation of concerns
- ✅ Security policies and modern Next.js patterns

---

## 🎨 UI/UX Features

- shadcn/ui component library (Radix UI primitives)
- Responsive sidebar navigation
- Drag-and-drop pond grid sorting
- Inline record editing modals
- Chart visualizations with Recharts
- Toast notifications
- Calendar and date pickers
- Form validation with Zod

---

## 🤖 AI Integrations

### OCR Service
- **Provider**: Google Gemini Vision
- **Models**: gemini-2.5-flash (primary), with fallback chain
- **Function**: Extracts production data from field report images
- **Features**: Per-field confidence scores, retry logic

### Bioremediation Chat
- **Provider**: DeepSeek
- **Function**: Contextualized treatment recommendations
- **Grounding**: Approved case history retrieval
- **Features**: Confidence scoring, user feedback collection

---

*Analysis Date: April 14, 2026*
*Project: AquaData - Plataforma Acuícola Digital*
*Location: Colombia*
