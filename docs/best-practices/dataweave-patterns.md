# DataWeave Best Practices

> **Applies to:** All  
> **Related Rules:** `DW-001` · `DW-002` · `DW-003` · `DW-004` · `DW-005`  
> **Last Updated:** April 2026

## When to Read This

Read this when writing DataWeave transformations, creating reusable DWL modules, or debugging type coercion issues with connectors.

---

## Key Principles

1. **Externalize complex transforms** — inline DWL > 5 lines should be in a `.dwl` file
2. **Create reusable modules** — shared logic goes in `dwl/modules/`
3. **Use full import paths** — `import X from dwl::modules::Y` (short paths fail at runtime)
4. **Match connector type expectations** — SF connector needs Java types, not strings
5. **Use kebab-case for file names** — `transform-order.dwl`, not `transformOrder.dwl`

---

## Project Structure

```
src/main/resources/dwl/
├── modules/                          # Reusable DWL modules
│   ├── salesforceUtility.dwl         # Type coercion for SF connector
│   ├── oauth1Header.dwl             # OAuth 1.0 HMAC-SHA256 header generator
│   └── dateUtils.dwl                # Shared date formatting functions
├── transforms/                       # Entity-specific transforms
│   ├── sf-account-to-ns-customer.dwl
│   ├── salesforce-upsert-response.dwl
│   ├── error-payload.dwl
│   └── ...
├── lookups/                          # Enum mapping modules
│   ├── countryMap.dwl                # ISO country → target system enum
│   └── currencyMap.dwl              # ISO currency → target system ID
└── dictionaries/                     # Environment-specific lookup data
    ├── customer-segment-dictionary-dev.json
    └── customer-segment-dictionary-prod.json
```

---

## Patterns

### Pattern 1: External DWL Transform Files

**Use when:** any transform exceeds 5 lines of DataWeave.

```xml
<!-- ❌ Bad — large inline transform -->
<ee:transform>
    <ee:set-payload><![CDATA[%dw 2.0
    <!-- 50+ lines of DataWeave -->
    ]]></ee:set-payload>
</ee:transform>

<!-- ✅ Good — external file reference -->
<ee:transform doc:name="SF Account → NS Customer">
    <ee:message>
        <ee:set-payload resource="dwl/transforms/sf-account-to-ns-customer.dwl"/>
    </ee:message>
</ee:transform>
```

### Pattern 2: Reusable DWL Modules

**Use when:** logic is shared across multiple transforms (date formatting, type coercion, enum lookups).

```dataweave
// dwl/modules/dateUtils.dwl
%dw 2.0

fun formatDate(date: DateTime) =
    date as String {format: "yyyy-MM-dd"}

fun formatDateTime(date: DateTime) =
    date as String {format: "yyyy-MM-dd'T'HH:mm:ss.SSSZ"}

fun maskPII(value: String) =
    value[0 to 2] ++ "****" ++ value[-2 to -1]

fun toErrorResponse(error, correlationId: String) = {
    correlationId: correlationId,
    timestamp: now(),
    error: error.errorType.identifier,
    message: error.description
}
```

**Import with full path:**

```dataweave
%dw 2.0
import dwl::modules::dateUtils
output application/json
---
{
    createdDate: dateUtils::formatDate(payload.CreatedDate)
}
```

> ⚠️ **Critical:** Always use `dwl::modules::moduleName` as the import path. Short paths like `modules::moduleName` will compile but **fail at runtime**.

### Pattern 3: Type Coercion for Connectors

**Use when:** passing data to the Salesforce connector (or any connector that expects Java types).

The SF connector rejects ISO datetime strings — they must be Java DateTime objects:

```dataweave
// dwl/modules/salesforceUtility.dwl
%dw 2.0

var dateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})?$/
var dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/

fun parseAndConvert(obj: Object) =
    obj mapObject ((value, key) ->
        if ((value is String) and ((value as String) matches dateTimePattern))
            (key): (value as String) as DateTime
        else if ((value is String) and ((value as String) matches dateOnlyPattern))
            (key): (value as String) as Date
        else if ((value is String) and ((value as String) == ""))
            (key): null
        else if (value is Object)
            (key): parseAndConvert(value)
        else
            (key): value
    )
```

**When to use `output application/java`:**

```dataweave
%dw 2.0
import dwl::modules::salesforceUtility
output application/java    // ← Required for SF connector inputs
---
salesforceUtility::parseAndConvert(payload)
```

Use `output application/java` for transforms that feed directly into connectors (SF, DB, NetSuite SOAP). Use `output application/json` for HTTP response payloads.

### Pattern 4: Cross-System Value Mapping

**Use when:** translating enum/picklist values between systems (country codes, currency codes, payment terms, industry classifications). There are 4 strategies — choose based on your data characteristics.

#### Strategy A: Rich-Object DWL Lookup (Standardized Reference Data)

**Use when:** stable reference data (ISO countries, currencies), ≤ 300 entries, same across all environments, callers need multiple fields (`.name`, `.erp`).

```dataweave
// dwl/lookups/countryMap.dwl
%dw 2.0

fun countryMap() = {
    "US": { "name": "United States", "erp": "_unitedStates" },
    "CA": { "name": "Canada",        "erp": "_canada" },
    "GB": { "name": "United Kingdom", "erp": "_unitedKingdom" }
    // 250+ entries for full ISO 3166...
}
```

**Usage — always null-guard before dereferencing:**

```dataweave
import countryMap from dwl::lookups::countryMap
---
{
    (shippingCountry: countryMap()[payload.ShippingCountry].erp)
        if (payload.ShippingCountry? and (countryMap()[payload.ShippingCountry] != null))
}
```

#### Strategy B: Environment-Specific JSON Dictionary

**Use when:** target system IDs differ between dev/staging/prod (e.g., ERP sandbox has different internal IDs than production). Flat key → value mapping loaded via `readUrl`.

```json
// dwl/dictionaries/customer-industry-dictionary-dev.json
{
  "Education": "1",
  "Financial Services": "13",
  "Government": "14"
}
```

```json
// dwl/dictionaries/customer-industry-dictionary-prod.json
{
  "Education": "101",
  "Financial Services": "113",
  "Government": "114"
}
```

**Load dynamically using environment property:**

```dataweave
var industry = readUrl(
    "classpath://dwl/dictionaries/customer-industry-dictionary-$(p('mule.env')).json",
    "application/json"
)
---
{
    (industryId: industry[payload.Industry]) if (payload.Industry?)
}
```

#### Strategy C: Bidirectional DWL Module (Enum Translation)

**Use when:** business enums must translate in both directions (CRM → ERP and ERP → CRM), ≤ 50 values, stable values (payment terms, billing frequency).

**Option 1 — Computed inverse (recommended for 1:1 mappings):**

```dataweave
// dwl/lookups/paymentTerms.dwl
%dw 2.0

// Single source of truth
var crmToErp = {
    "Net 15": "1", "Net 30": "2", "Net 45": "8",
    "Net 60": "3", "Due on receipt": "4"
}

// Auto-computed inverse — no dual maintenance
var erpToCrm = crmToErp pluck ((value, key) -> { (value): key as String })
                reduce ((item, acc = {}) -> acc ++ item)

fun mapPaymentTermToERP(crmValue: String) = crmToErp[crmValue]
fun mapPaymentTermToCRM(erpId: String) = erpToCrm[erpId]
```

**Option 2 — Explicit dual dictionary (required for many-to-one):**

When 3 CRM statuses map to 1 ERP status, the computed inverse is ambiguous. Maintain both directions explicitly:

```dataweave
var statusMap = {
    crmToErp: { "Open": "1", "In Progress": "1", "Closed": "2" },
    erpToCrm: { "1": "Open", "2": "Closed" }
}
```

#### Strategy D: External API / ObjectStore Cache (Dynamic Catalogs)

**Use when:** > 500 values, business users manage mappings at runtime, multiple apps share the same mapping, change frequency > quarterly.

```xml
<os:object-store name="product-sku-cache"
    entryTtl="3600000"
    expirationInterval="300000"
    maxEntries="500"/>
```

#### Decision Tree

```
Does the mapping differ between dev/staging/prod?
  ├── YES → Strategy B (Environment-Specific JSON Dictionary)
  └── NO
        ├── Need lookup in both directions (CRM↔ERP)?
        │     ├── YES, ≤ 50 values → Strategy C (Bidirectional DWL)
        │     └── YES, > 50 values → Strategy D (External)
        └── NO (one direction only)
              ├── Need rich objects (name + ID)? → Strategy A (Rich-Object DWL)
              └── Simple key→value? → Strategy A (flat DWL function)
```

**Testing guidance:**

- **Completeness:** When CRM adds a new picklist value, the lookup silently returns `null`. Add MUnit tests that validate all known enum values have mappings.
- **Symmetry:** For 1:1 bidirectional mappings, `mapToERP(mapFromERP(x)) == x` should hold.
- **Environment parity:** For Strategy B, verify that dev and prod dictionary files have the **same keys** (only IDs should differ).

> ⚠️ **Always null-guard lookups** — `countryMap()[code]` returns `null` for unknown codes. Dereferencing `.erp` on `null` causes a runtime error.

### Pattern 5: Array Normalization for Connectors

**Use when:** connector operations (upsert, create, update) always expect arrays, but input may be a single object.

```dataweave
%dw 2.0
import dwl::modules::salesforceUtility
output application/java
---
var parsed = salesforceUtility::parseAndConvert(payload)
---
if (parsed is Array) parsed else [parsed]
```

### Pattern 6: Error Payload Template

**Use when:** building standardized error response payloads.

```dataweave
// dwl/transforms/error-payload.dwl
%dw 2.0
output application/json
---
{
    timestamp: now() as String {format: "yyyy-MM-dd'T'HH:mm:ss.SSSZ"},
    correlationId: vars.correlationId default "",
    entity: vars.entity default "",
    salesforceId: vars.salesforceId default "",
    errorType: error.errorType.identifier default "UNKNOWN",
    message: error.detailedDescription default error.description default "",
    environment: p('mule.env')
}
```

---

## Java 17 DataWeave Considerations

Since Mule 4.9+ mandates Java 17:

- `try()` requires explicit import: `import try from dw::Runtime`
- `error.errorType.identifier` — use `.identifier`, not `.asString` (doesn't exist)
- Batch Kryo serialization — don't use `output application/java` for HTTP payloads in batch steps
- `DateTime` coercion is stricter in Java 17 — always test date parsing patterns

**Safe error description extraction using `try()`:**

```dataweave
%dw 2.0
import try from dw::Runtime
var errorDesc = try(() -> error.errorMessage.payload.errorDescription default "")
---
{
    "Subject": "Failed to sync record",
    "Error": if (errorDesc.success and !isBlank(errorDesc.result))
                 errorDesc.result
             else (error.detailedDescription default "")
}
```

> ⚠️ Use `try()` when accessing deeply nested error properties that may not exist. Without it, accessing `error.errorMessage.payload.errorDescription` throws if `payload` is not an object.

---

## File Naming Convention

| Convention   | Example                        | Use For                                      |
| ------------ | ------------------------------ | -------------------------------------------- |
| `kebab-case` | `transform-order-response.dwl` | Transform files                              |
| `camelCase`  | `salesforceUtility.dwl`        | Module files (matches DWL import convention) |
| `kebab-case` | `country-map.dwl`              | Lookup files                                 |

> **Note:** Module filenames use `camelCase` because the DWL import path must match the filename exactly (`import dwl::modules::salesforceUtility`). Renaming to kebab-case would break imports.

---

## Checklist

- [ ] No inline DWL exceeding 5 lines — externalize to `.dwl` files
- [ ] Shared logic in `dwl/modules/` with full import path
- [ ] `output application/java` used for connector input transforms
- [ ] `output application/json` used for HTTP response transforms
- [ ] Type coercion applied before passing data to SF connector
- [ ] Lookup modules always null-guarded
- [ ] Array normalization before connector operations
- [ ] `.dwl` files have Javadoc-style header comments

---

**See also:** [Connector Patterns](connector-patterns.md) · [Documentation Standards](documentation-standards.md)
