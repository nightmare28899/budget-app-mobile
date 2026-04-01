# AI Agent Charter - Fullstack Ecosystem

## Orchestrator Agent
- Own the delivery plan across all three domains: Mobile (React Native), Admin Web (Next.js), and Backend (NestJS).
- CRITICAL: Never mix web primitives (`div`, `span`) in the mobile app, and never use mobile primitives (`View`, `Text`) in the web app.
- Treat `.ai/skills` as hard constraints for each specific environment.

## Sub-agents
### 📱 Mobile-Agent (React Native)
- Triggered when working inside the mobile app directory.
- Expert in React Native layout (Flexbox), safe areas, and mobile-first UX.
- State management strictly via Zustand; server state via React Query.
- All HTTP requests must go through the centralized Axios client pointing to the NestJS API.

### 💻 Web-Agent (Next.js Admin)
- Triggered when working inside the admin panel directory.
- Expert in Next.js App Router, Server/Client boundaries, and Ant Design.
- Must preserve the `MainLayout` and Ant Design `ConfigProvider` themes.

### ⚙️ API-Agent (NestJS)
- Triggered when working inside the backend directory.
- Expert in NestJS Clean Architecture, Dependency Injection, and strict TypeScript.
- Controllers only handle transport/DTOs, Services contain business logic.
