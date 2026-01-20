# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A monorepo containing a subtitles broadcast system with Go backend and React frontend, designed for real-time subtitle display and management. The system uses MQTT for real-time communication and Keycloak for authentication.

## Repository Structure

- `backend/` - Go REST API server (Gin framework)
- `frontend/` - React SPA with Redux state management
- `docker-compose.yml` - Production Docker setup for both services

## Backend (Go)

### Development Commands

```bash
cd backend

# Build the application
make build

# Run the server
go run ./cmd/bssvr/main.go

# Run linter
make lint

# Run database migrations
make migrate
```

The backend requires:
- PostgreSQL database connection
- Keycloak authentication server
- Environment variables (see `.env` file)

### Backend Architecture

- **Entry point**: `cmd/bssvr/main.go` - Simple HTTP server with graceful shutdown
- **Core API**: `internal/api/`
  - `app.go` - Application initialization and configuration
  - `router.go` - Route definitions (REST API v1)
  - `handler.go` - HTTP request handlers for slides, bookmarks, sources
  - `middleware.go` - CORS and user role middleware
  - `models.go` - Request/response data structures
  - `archive.go` - Archive-related handlers
- **Config**: `internal/config/` - Environment-based configuration
- **Database**: `internal/pkg/database/postgres.go` - PostgreSQL connection using GORM
- **Auth**: `pkg/auth/` - Keycloak integration

### API Endpoints

All endpoints are prefixed with `/api/v1`:
- `POST/GET/DELETE /bookmark` - User bookmarks
- `POST/GET/PATCH/DELETE /slide` - Slide management
- `POST /custom_slide` - Custom slides
- `DELETE /source-slide/:source_uid` - Delete slides by source
- `GET /author` - Author list
- `GET /auto_complete` - Source autocomplete
- `GET /source_path` - Source paths
- `PATCH /source_path_id/:id` - Update source path
- `GET/POST /user/settings` - User settings
- `GET /ready` - Health check

### Database

Uses PostgreSQL with GORM ORM. Migrations are in `script/database/migration/` and managed via golang-migrate.

## Frontend (React)

### Development Commands

```bash
cd frontend

# Install dependencies
npm install

# Run development server (http://localhost:3000)
npm start

# Run tests
npm test

# Build for production
npm run build
```

### Frontend Architecture

**State Management (Redux)**:
- `Redux/Store.jsx` - Redux store configuration with redux-persist
- `Redux/SlidesSlice.js` - Slides state and actions
- `Redux/BookmarksSlice.js` - Bookmarks state
- `Redux/SourceSlice.js` - Source documents state
- `Redux/UserSettingsSlice.js` - User preferences
- `Redux/UserProfile/` - User authentication state
- `Redux/MQTT/` - MQTT connection state
- `Redux/Subtitle/` - Subtitle display state

**Pages** (main routes in `Pages/`):
- `Source.jsx` - Source document management and browsing
- `NewSlides.jsx` - Slide creation and editing interface
- `Subtitles.jsx` - Real-time subtitle display
- `QuestionModule.jsx` - Q&A module for live sessions
- `Archive.jsx` - Historical slides archive
- `GreenScreen.jsx` - Green screen mode for broadcasting
- `Settings.jsx` - User settings

**Key Components** (`Components/`):
- Reusable UI components for the application

**Utilities** (`Utils/`):
- `SlideSplit.test.js` - Slide splitting logic with tests

**Services**:
- API calls to backend via axios
- MQTT integration for real-time updates (mqtt library v5.3.6)

### Frontend Stack

- React 18 with React Router v6
- Redux Toolkit with Redux Persist
- Material-UI (MUI) v6
- React Bootstrap
- Keycloak for authentication (@react-keycloak/web)
- MQTT for real-time messaging
- Markdown rendering (react-markdown)
- DOCX preview support

## Environment Configuration

Root-level `.env` file configures both frontend and backend:

**Backend**:
- `BSSVR_BACKEND_PORT` - Backend server port (default: 8080)
- `BSSVR_DB_USER`, `BSSVR_DB_PASSWORD`, `BSSVR_DB` - PostgreSQL credentials
- `BSSVR_KEYCLOAK_URL`, `BSSVR_KEYCLOAK_REALM`, `BSSVR_KEYCLOAK_CLIENT_ID` - Keycloak auth config

**Frontend**:
- `REACT_APP_PORT` - Development server port (default: 3000)
- `REACT_APP_API_BASE_URL` - Backend API URL
- `REACT_APP_MQTT_URL`, `REACT_APP_MQTT_PROTOCOL`, `REACT_APP_MQTT_PORT` - MQTT broker config

Copy `.env.template` to `.env` and fill in your values.

## Docker Deployment

### Backend

```bash
cd backend
docker-compose up -d
```

Backend uses multi-stage Docker builds with Nginx.

### Frontend

```bash
cd frontend
docker build -t subtitles-frontend:latest .
docker run -d -p 80:80 --name subtitles-frontend subtitles-frontend:latest
```

Frontend is served via Nginx in production.

## Authentication Flow

1. Keycloak handles user authentication (OIDC)
2. Backend middleware validates tokens and extracts user roles
3. Frontend stores auth state in Redux and uses @react-keycloak/web
4. User roles determine access to features

## Real-time Communication

MQTT is used for:
- Broadcasting subtitle updates to viewers
- Real-time slide changes
- Live question submissions in QuestionModule

The MQTT broker configuration is shared between frontend clients.

## Key Patterns

- **Monorepo**: Both backend and frontend in one repository
- **RESTful API**: Backend exposes REST endpoints consumed by frontend
- **Real-time**: MQTT pub/sub for live updates
- **State persistence**: Redux Persist maintains user state across sessions
- **Authentication**: Keycloak SSO for centralized auth
- **Database**: GORM ORM with PostgreSQL
