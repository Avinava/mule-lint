# API contract validation

`MSTD-API-002` treats RAML and OpenAPI files as consumer-facing contracts rather than incidental implementation files.

Use the dedicated command so API parsing does not change Mule XML lint behavior:

```bash
mule-lint api validate ./api --main api.raml \
  --ruleset ./rulesets/mule-http-api-baseline.yaml
```

The validator supports RAML 0.8 and 1.0 plus OpenAPI 2.0 and 3.0. It uses AMF for syntax and semantic validation, then optionally applies local AMF Validation Profiles. References are limited to the project and explicitly allowed dependency roots; HTTP references and symlink escapes are not fetched.

Exit codes are stable for automation: `0` means conformant, `1` means validation findings, and `2` means configuration or execution failure. JSON and SARIF output are available with `--format`.

The bundled `rulesets/mule-http-api-baseline.yaml` checks a deliberately small set of portable contract qualities. URI shape, collection naming, pagination, idempotency, status selection, compatibility, and error modeling remain design decisions that require consumer context; they should not be enforced as universal syntax rules.

Sources:

- [AMF parsing and validation](https://a.ml/docs/amf/using-amf/amf_validation)
- [AMF supported specifications](https://a.ml/docs/amf/amf_support)
- [MuleSoft API Designer](https://docs.mulesoft.com/design-center/design-create-publish-api-specs)
- [HTTP Semantics (RFC 9110)](https://www.rfc-editor.org/rfc/rfc9110)
