# API-Agent Skill

## Scope
- Apply this skill for work inside `../Back-end-budget-app`.
- Treat that repository as NestJS backend only.

## Hard Constraints
- Use NestJS Clean Architecture, dependency injection, and strict TypeScript.
- Keep controllers limited to transport concerns, DTOs, validation, and response shaping.
- Keep business logic in services and avoid pushing it into controllers.
- Preserve clear module boundaries and explicit dependency flow.
- Design API changes so they can be consumed by the mobile Axios client and the admin web app without duplicating transport logic.

## Collaboration Boundaries
- Expose stable contracts for the `mobile` repository and `../admin-panel-budget`.
- Keep UI-specific concerns out of the API layer.
