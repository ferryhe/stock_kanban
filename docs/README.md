# Stock Kanban Documentation

> Last Updated: February 16, 2026

This directory contains comprehensive documentation for the Stock Kanban project - a full-stack stock dashboard with backtest and live paper trading capabilities.

## 📂 Documentation Structure

### [Plans/](./Plans)
Development planning documents outlining feature roadmaps and implementation strategies.
- Phase 1-5 Backtest Plans
- Real-time Trading Plans

### [Reports/](./Reports)
Implementation and testing reports documenting completed features and milestones.
- Phase Implementation Reports (1-5)
- Authentication Integration Reports
- Testing Validation Reports

### [Guides/](./Guides)
User and developer guides for setup, configuration, and testing.
- Testing Guides (Phases 1-5)
- Local Development Guide
- Implementation Guide
- User Permission Management Guide

### [Summaries/](./Summaries)
High-level overviews and consolidated documentation.
- **CONSOLIDATED_DESIGN.md** - Complete system architecture and design
- **USER_PERMISSION_MANAGEMENT.md** - Multi-tenant architecture and permissions
- **DEPLOYMENT_INDEX.md** - Deployment documentation index
- Chinese language summaries (ZH)

### [References/](./References)
Technical reference materials and code review recommendations.
- Backtesting Framework References (Backtrader, QuantConnect, Zipline)
- Code Review Recommendations

### [Archive/](./Archive)
Historical documentation superseded by newer versions.

## 🚀 Quick Start

### For New Users
1. Start with [../README.md](../README.md) - Main project README
2. Read [Guides/LOCAL_DEVELOPMENT.md](./Guides/LOCAL_DEVELOPMENT.md) - Local setup instructions
3. Review [Summaries/CONSOLIDATED_DESIGN.md](./Summaries/CONSOLIDATED_DESIGN.md) - System architecture

### For Developers
1. [Guides/DEVELOPMENT_GUIDE.md](./Guides/DEVELOPMENT_GUIDE.md) - Development documentation index
2. [Summaries/USER_PERMISSION_MANAGEMENT.md](./Summaries/USER_PERMISSION_MANAGEMENT.md) - Authentication system
3. [References/CODE_REVIEW_RECOMMENDATIONS.md](./References/CODE_REVIEW_RECOMMENDATIONS.md) - Best practices

### For Deployment
1. [Summaries/DEPLOYMENT_INDEX.md](./Summaries/DEPLOYMENT_INDEX.md) - Deployment guides index
2. [Guides/IMPLEMENTATION_GUIDE.md](./Guides/IMPLEMENTATION_GUIDE.md) - Setup and configuration

## 📊 Project Timeline

### Phase 1: Backtest Engine Core (February 7, 2026)
- MVP backtest engine implementation
- API endpoints and frontend pages
- **Status**: ✅ Complete

### Phase 2: PostgreSQL Persistence (February 8, 2026)
- Database integration
- Backward-compatible fallback
- **Status**: ✅ Complete

### Phase 3: Multi-Algorithm Comparison (February 8, 2026)
- Algorithm comparison features
- History API and optimization
- **Status**: ✅ Complete

### Phase 4: Backtest History UI (February 8, 2026)
- History API implementation
- Frontend query interface
- **Status**: ✅ Complete

### Phase 5: Real-Time Trading System (February 8-9, 2026)
- Live paper trading
- User authentication and permissions
- Risk management
- Protected routing
- **Status**: ✅ Complete

## 🎯 Current Status (February 2026)

The Stock Kanban platform is feature-complete with:
- ✅ Backtest engine with multi-algorithm support
- ✅ Live paper trading system
- ✅ User authentication and role-based permissions
- ✅ PostgreSQL persistence with fallback mode
- ✅ Comprehensive testing and validation
- ✅ Production deployment guides

## 📝 Document Naming Convention

- **Timestamped files**: `YYYYMMDD DESCRIPTION.md` - Implementation records with dates
- **General files**: `DESCRIPTION.md` - Living documents without timestamps
- **Language variants**: `_ZH.md` suffix for Chinese versions

## 🔍 Finding Documentation

**By Topic:**
- Architecture & Design → [Summaries/CONSOLIDATED_DESIGN.md](./Summaries/CONSOLIDATED_DESIGN.md)
- Authentication → [Summaries/USER_PERMISSION_MANAGEMENT.md](./Summaries/USER_PERMISSION_MANAGEMENT.md)
- Deployment → [Summaries/DEPLOYMENT_INDEX.md](./Summaries/DEPLOYMENT_INDEX.md)
- Development → [Guides/DEVELOPMENT_GUIDE.md](./Guides/DEVELOPMENT_GUIDE.md)

**By Phase:**
- Phase N Plan → `Plans/YYYYMMDD BACKTEST_PHASEN_PLAN.md`
- Phase N Report → `Reports/YYYYMMDD BACKTEST_PHASEN_IMPLEMENTATION_REPORT.md`
- Phase N Testing → `Guides/YYYYMMDD BACKTEST_PHASEN_TESTING_GUIDE.md`

## 📮 Feedback

For documentation updates or corrections, please create an issue in the repository.
