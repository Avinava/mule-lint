# Testing with MUnit

> **Applies to:** All  
> **Related Rules:** `EXP-003`  
> **Last Updated:** April 2026

## When to Read This

Read this when writing MUnit tests, setting up test infrastructure, or testing event-driven flows.

---

## Test Coverage Goals

| Test Type            | Coverage Target    | Purpose                        |
| -------------------- | ------------------ | ------------------------------ |
| Unit Tests           | 80%+ flow coverage | Validate individual flow logic |
| Integration Tests    | All critical paths | Validate end-to-end scenarios  |
| Error Scenario Tests | All error handlers | Validate error responses       |

---

## Patterns

### Pattern 1: Standard MUnit Test Structure

```xml
<munit:test name="create-order-success-test"
            description="Validates successful order creation">

    <!-- Mock external dependencies -->
    <munit:behavior>
        <munit-tools:mock-when processor="http:request">
            <munit-tools:with-attributes>
                <munit-tools:with-attribute attributeName="config-ref"
                                            whereValue="API_HTTP_Config"/>
            </munit-tools:with-attributes>
            <munit-tools:then-return>
                <munit-tools:payload value='{"orderId": "12345"}'/>
            </munit-tools:then-return>
        </munit-tools:mock-when>
    </munit:behavior>

    <!-- Execute the flow -->
    <munit:execution>
        <flow-ref name="create-order-flow"/>
    </munit:execution>

    <!-- Assert results -->
    <munit:validation>
        <munit-tools:assert-that expression="#[payload.orderId]"
                                  is="#[MunitTools::notNullValue()]"/>
    </munit:validation>
</munit:test>
```

### Pattern 2: Testing Error Handlers

```xml
<munit:test name="error-handler-400-test"
            description="Validates 400 Bad Request error handling"
            expectedErrorType="APIKIT:BAD_REQUEST">

    <munit:behavior>
        <munit-tools:mock-when processor="apikit:router">
            <munit-tools:then-call exception="APIKIT:BAD_REQUEST"/>
        </munit-tools:mock-when>
    </munit:behavior>

    <munit:execution>
        <flow-ref name="api-main"/>
    </munit:execution>

    <munit:validation>
        <munit-tools:assert-that expression="#[vars.httpStatus]"
                                  is="#[MunitTools::equalTo(400)]"/>
        <munit-tools:assert-that expression="#[payload.error]"
                                  is="#[MunitTools::equalTo('InvalidInput')]"/>
    </munit:validation>
</munit:test>
```

### Pattern 3: Testing Event-Driven Flows

For PAPI-style flows driven by Platform Events, mock the event payload and downstream SAPI calls:

```xml
<munit:test name="account-event-processing-test"
            description="Validates Account event → NS Customer sync">

    <munit:behavior>
        <!-- Mock the SAPI HTTP call -->
        <munit-tools:mock-when processor="http:request">
            <munit-tools:with-attributes>
                <munit-tools:with-attribute attributeName="config-ref"
                    whereValue="SAPI_HTTP_Config"/>
            </munit-tools:with-attributes>
            <munit-tools:then-return>
                <munit-tools:payload value='{"status":"success","internalId":"123"}'/>
            </munit-tools:then-return>
        </munit-tools:mock-when>

        <!-- Mock the writeback SAPI call -->
        <munit-tools:mock-when processor="http:request">
            <munit-tools:with-attributes>
                <munit-tools:with-attribute attributeName="doc:name"
                    whereValue="Writeback Request"/>
            </munit-tools:with-attributes>
            <munit-tools:then-return>
                <munit-tools:payload value='{"success":true}'/>
            </munit-tools:then-return>
        </munit-tools:mock-when>
    </munit:behavior>

    <munit:execution>
        <!-- Set variables as the event listener would -->
        <set-variable variableName="correlationId" value="test-uuid-123"/>
        <set-variable variableName="logCategory" value="com.myorg.papi"/>
        <set-variable variableName="salesforceId" value="001XXXXX"/>
        <set-payload value='#[readUrl("classpath://test-data/account-event.json", "application/json")]'/>
        <flow-ref name="account-process-subflow"/>
    </munit:execution>

    <munit:validation>
        <munit-tools:assert-that expression="#[payload.status]"
                                  is="#[MunitTools::equalTo('success')]"/>
    </munit:validation>
</munit:test>
```

### Pattern 4: Test Organization

```
src/test/
├── munit/
│   ├── salesforce-upsert-test.xml       # Operation-specific tests
│   ├── salesforce-create-test.xml
│   ├── salesforce-query-test.xml
│   ├── salesforce-delete-test.xml
│   ├── salesforce-process-subflow-test.xml  # Routing tests
│   ├── error-handling-test.xml          # Error scenario tests
│   └── common-test-resources.xml        # Shared mocks
└── resources/
    ├── log4j2-test.xml                  # Console-only, noise-suppressed
    └── test-data/                       # Test payloads
        ├── account-event.json
        └── order-request.json
```

---

## Key Principles

1. **Mock all external dependencies** — never call real systems in unit tests
2. **Test all error handler branches** — verify each HTTP status code / error type
3. **Use descriptive test names** — names should describe the scenario being tested
4. **Isolate tests** — each test should be independent (no shared state)
5. **Separate test log config** — use `log4j2-test.xml` with console appender and suppressed noise

---

## Running Tests

```bash
# Full test suite
mvn clean test -Dmule.env=dev -Dsecure.key=test

# Specific test suite
mvn test -Dmule.env=dev -Dsecure.key=test -Dtest=salesforce-upsert-test

# Package (skip tests)
mvn clean package -DskipTests
```

> **Note:** MUnit requires MuleSoft Enterprise Edition license. If the `licm` check fails in your dev environment, verify with `mvn process-classes` (schema validation passes without EE license).

---

## Checklist

- [ ] 80%+ flow coverage with MUnit
- [ ] All error handler branches tested
- [ ] External dependencies mocked (HTTP, connectors, databases)
- [ ] Test names clearly describe the scenario
- [ ] `log4j2-test.xml` configured for test environment
- [ ] Test data externalized to `test-data/` directory

---

**See also:** [Error Handling](error-handling.md) · [CI/CD Integration](ci-cd.md)
