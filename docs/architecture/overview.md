# Architecture Overview

## System Diagram

```mermaid
graph TD
    A[Client] --> B[API]
    B --> C[Database]
    B --> D[External Service]
```

## Key Components

### [Component 1]
- **Purpose:** [what it does]
- **Location:** `src/[path]`
- **Dependencies:** [what it depends on]

## External Dependencies

| Service | Purpose | Docs |
|---------|---------|------|
| [e.g., Shopify API] | [Product management] | [link] |

## Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| [DATABASE_URL] | [DB connection] | Yes |
