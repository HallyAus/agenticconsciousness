---
name: coding-patterns
description: Project-specific coding patterns and conventions. Load when writing, refactoring, or reviewing code.
---

# Coding Patterns

## File Organisation

- Group by feature, not by type
- Keep files under 300 lines where practical
- One public class/component per file

## Naming

- **Files:** `kebab-case.ext`
- **Functions:** `snake_case` (Python) / `camelCase` (JS/TS)
- **Classes:** `PascalCase`
- **Constants:** `UPPER_SNAKE_CASE`
- **DB tables:** `snake_case`, plural

## Error Handling

- Handle errors explicitly, never swallow silently
- Custom error types for domain errors
- Log with context (what was attempted, relevant IDs)

## Patterns We Use

- [e.g., Repository pattern for data access]
- [e.g., Service layer between routes and data]
- [e.g., Dependency injection via constructor]

## Patterns We Avoid

- [e.g., God objects / classes over 500 lines]
- [e.g., Global mutable state]
- [e.g., Magic numbers — use named constants]

## Common Utilities

```
[List shared imports, helpers, utilities Claude should reuse]
```
