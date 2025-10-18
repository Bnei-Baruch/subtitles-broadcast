# Subtitles Broadcast Application

A modern subtitle management system with Keycloak integration for authentication and role-based access control.

## 📚 Documentation

All documentation is organized in the [`docs/`](docs/) folder:

- **[📋 Documentation Index](docs/README.md)** - Complete documentation overview
- **[🔧 Environment Setup](docs/ENVIRONMENT_SETUP.md)** - Development environment setup guide
- **[🔐 Keycloak Configuration](docs/KEYCLOAK_SERVICE_ACCOUNT_SETUP.md)** - Keycloak service account setup
- **[🏗️ Technical Design](docs/TECHNICAL_DESIGN_KEYCLOAK.md)** - Architecture and design documentation

## 🚀 Quick Start

1. **Read the documentation** - Start with [docs/README.md](docs/README.md)
2. **Set up environment** - Follow [docs/ENVIRONMENT_SETUP.md](docs/ENVIRONMENT_SETUP.md)
3. **Configure Keycloak** - Use [docs/KEYCLOAK_SERVICE_ACCOUNT_SETUP.md](docs/KEYCLOAK_SERVICE_ACCOUNT_SETUP.md)

## 🏗️ Project Structure

```
subtitles-broadcast/
├── docs/                    # 📚 All documentation
├── backend/                 # 🔧 Go backend application
├── frontend/               # ⚛️ React frontend application
└── README.md              # This file
```

## 🔒 Security

**IMPORTANT**: Never commit `.env` files! Use `.env.template` files as reference.

## 📖 Features

- **User Management** - Create, update, and manage users
- **Role-Based Access Control** - Assign and manage user roles
- **Keycloak Integration** - Secure authentication and authorization
- **Admin Interface** - Web-based administration panel
- **Pagination** - Efficient handling of large user lists

---

*For detailed information, see the [documentation](docs/README.md).*
