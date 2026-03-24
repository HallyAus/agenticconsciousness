---
name: testing
description: Testing patterns and requirements. Load when writing tests or validating changes.
---

# Testing

## Framework

- **Unit:** [pytest / Jest / Go testing]
- **Integration:** [pytest fixtures / supertest]
- **E2E:** [Playwright / Cypress / none]

## Commands

```bash
[COMMAND]    # all tests
[COMMAND]    # specific file
[COMMAND]    # with coverage
[COMMAND]    # watch mode
```

## Structure

- Tests live next to code: `module.py` → `test_module.py`
- Naming: `test_[function]_[scenario]_[expected]`

## Requirements

- All public functions must have tests
- Happy path + at least one error case
- Edge cases for data boundaries
- Mock externals in unit tests, real deps in integration

## Before Closing a Beads Issue

1. All existing tests pass
2. New tests for new functionality
3. No coverage regressions
