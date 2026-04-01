# Mobile-Agent Skill

## Scope
- Apply this skill for work inside the `mobile` repository.
- Treat this repository as React Native only.

## Hard Constraints
- Never use web primitives such as `div`, `span`, or DOM-only APIs.
- Prefer React Native layout with Flexbox and explicit safe-area handling.
- Use Zustand for client state and React Query for server state.
- Route all HTTP calls through the centralized Axios client that targets the NestJS API.
- Preserve mobile-first UX, touch ergonomics, and platform-specific behavior where needed.

## Collaboration Boundaries
- Coordinate contracts with the backend repository at `../Back-end-budget-app`.
- Keep web-only concerns in `../admin-panel-budget`.
