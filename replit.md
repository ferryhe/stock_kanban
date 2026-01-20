# QuantDashboard - Mobile Stock Analysis

## Overview

A mobile-first quantitative stock dashboard that provides real-time stock analysis with technical indicators. The application monitors specific stock sectors and provides trading signals based on RSI, volume analysis, and trend indicators. Built with a React frontend and Express backend, using Yahoo Finance for market data.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state caching and synchronization
- **Styling**: Tailwind CSS with shadcn/ui component library
- **Animations**: Framer Motion for smooth UI transitions
- **Design**: Dark mode enforced by default, mobile-first responsive design with card-based layouts

### Backend Architecture
- **Runtime**: Node.js with Express 5
- **Language**: TypeScript with ESM modules
- **API Pattern**: RESTful endpoints under `/api/` prefix
- **Development**: Vite dev server with HMR, proxied through Express in development

### Data Flow
1. Frontend requests stock data via `/api/stocks/:watchlistId`
2. Backend fetches from Yahoo Finance using `yahoo-finance2` library
3. Backend calculates technical indicators (RSI, Volume Spike, SMA trend)
4. Data is cached server-side for 60 seconds to prevent API rate limiting
5. Frontend caches responses with React Query

### Technical Analysis Logic
- **RSI (14-day)**: Oversold below 30 (BUY signal), Overbought above 70 (SELL signal)
- **Volume Spike**: Flags when current volume exceeds 1.5x the 10-day average
- **Trend**: Compares price against 20-day Simple Moving Average

### Build System
- **Development**: Vite serves the React app, Express handles API routes
- **Production**: Vite builds static assets, esbuild bundles the server, output to `dist/` directory

## External Dependencies

### Database
- **PostgreSQL**: Configured via Drizzle ORM with schema in `shared/schema.ts`
- **Session Storage**: `connect-pg-simple` for Express sessions (if needed)
- **Current Storage**: In-memory storage implementation exists as fallback

### Third-Party APIs
- **Yahoo Finance**: Primary data source via `yahoo-finance2` package for real-time stock quotes and historical data

### Key NPM Packages
- `@tanstack/react-query`: Server state management
- `drizzle-orm` / `drizzle-zod`: Database ORM and schema validation
- `yahoo-finance2`: Stock market data API client
- `wouter`: Client-side routing
- `framer-motion`: Animation library
- Radix UI primitives: Accessible component foundations