# MuleSoft Documentation Standards

Detailed, up-to-date documentation is critical for the long-term maintainability of integration projects. This guide outlines how to document MuleSoft applications effectively.

## 1. Code-Level Documentation

### Flow Documentation
Every flow should have a `doc:description` explaining its purpose, input, and output.

```xml
<flow name="process-order-flow" 
      doc:name="Process Order" 
      doc:description="Orchestrates the order fulfillment process. Input: Order JSON. Output: Order Status JSON.">
    <!-- ... -->
</flow>
```

### Component Documentation
Use the `doc:name` attribute to provide a human-readable display name for components in the Studio canvas.
*   **Bad**: `Request`, `Transform Message`
*   **Good**: `Request System API`, `Map to Common Model`

### Complex DataWeave
For complex transformations, use Javadoc-style comments within the `.dwl` file to explain the logic.

```dataweave
/**
 * Maps the canonical Order model to the SAP specific format.
 * Handles extensive field mapping and conditionally populates optional fields.
 *
 * @param payload The canonical Order object
 * @return SAP Order structure
 */
%dw 2.0
output application/xml
---
{
    // ...
}
```

## 2. README.md Structure

Every repository must contain a `README.md` at the root. Use this template:

```markdown
# [Application Name]

[Short Description of what the application does]

## Architecture
- **Layer**: [System/Process/Experience]
- **Domain**: [e.g., Finance, Logistics]
- **Dependencies**: [List dependent System APIs or external systems]

## Setup & Installation
1. Clone the repo
2. Configure `dev.yaml` with your credentials...

## Features
- Order Creation
- Inventory Check

## API Specification
[Link to Exchange or local RAML]
```

## 3. API Documentation (Exchange)

Maintain your API specification (RAML/OAS) in Anypoint Exchange.
*   **Description**: Provide a high-level overview of the API.
*   **Examples**: Include valid request/response examples for every endpoint.
*   **Status Codes**: Document all possible HTTP return codes (200, 400, 401, 500).

## 4. Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

*   `feat: add new order processing logic`
*   `fix: resolve null pointer in mapping`
*   `docs: update README with deployment steps`
*   `chore: upgrade mule maven plugin`
