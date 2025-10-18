# 📚 Subtitles Broadcast Documentation

Welcome to the Subtitles Broadcast application documentation. This folder contains all technical documentation, setup guides, and design specifications.

## 📋 Documentation Index

### 🔧 Setup & Configuration
- **[Environment Setup Guide](ENVIRONMENT_SETUP.md)** - Complete guide for setting up development environment
- **[Keycloak Service Account Setup](KEYCLOAK_SERVICE_ACCOUNT_SETUP.md)** - Step-by-step Keycloak configuration

### 🏗️ Architecture & Design
- **[Technical Design - Keycloak Integration](TECHNICAL_DESIGN_KEYCLOAK.md)** - Comprehensive technical design document
- **[Keycloak Client Roles Design](DESIGN_KEYCLOAK_CLIENT_ROLES.md)** - Design document for client roles implementation

## 🚀 Quick Start

1. **Read the Environment Setup Guide** - Start with `ENVIRONMENT_SETUP.md`
2. **Configure Keycloak** - Follow `KEYCLOAK_SERVICE_ACCOUNT_SETUP.md`
3. **Review Technical Design** - Understand the architecture in `TECHNICAL_DESIGN_KEYCLOAK.md`

## 📁 Project Structure

```
subtitles-broadcast/
├── docs/                    # 📚 All documentation (this folder)
├── backend/                 # 🔧 Go backend application
│   ├── .env.template       # Environment configuration template
│   └── .env.dev.template   # Development environment template
├── frontend/               # ⚛️ React frontend application
│   └── .env.template      # Frontend environment template
└── README.md              # Main project README
```

## 🔒 Security Notice

**IMPORTANT**: Never commit `.env` files to the repository! They contain sensitive information like passwords and API keys. Always use the `.env.template` files as a reference.

## 📖 Documentation Standards

- All documentation is written in Markdown
- Use clear, descriptive headings
- Include code examples where helpful
- Keep documentation up-to-date with code changes
- Use emojis for better readability

## 🤝 Contributing

When adding new features or making changes:
1. Update relevant documentation
2. Add new documentation files to this folder
3. Update this index if needed
4. Follow the existing documentation style

---

*Last updated: October 18, 2025*
