# Web-Agent Skill

## Scope
- Apply this skill for work inside `../admin-panel-budget`.
- Treat that repository as Next.js App Router web only.

## Hard Constraints
- Never use React Native primitives such as `View`, `Text`, or mobile-only APIs.
- Preserve `MainLayout` and the Ant Design `ConfigProvider` theme setup.
- Respect Server Component and Client Component boundaries explicitly.
- Prefer framework-native Next.js App Router patterns over ad hoc routing.
- Keep UI changes aligned with Ant Design conventions and shared theme decisions.

## Collaboration Boundaries
- Consume backend contracts from `../Back-end-budget-app`.
- Keep mobile-only concerns in the `mobile` repository.
