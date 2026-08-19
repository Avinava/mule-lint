# Behavior-Focused Testing with MUnit

> **Standard:** `MSTD-TEST-001` · **Related rule:** `EXP-003`

Use MUnit to demonstrate externally meaningful Mule behavior, not merely to execute processors. A
useful test explains what enters the flow, which boundary conditions are controlled, and what a
caller, source, dependency, or state store can observe afterward.

## Start with a behavior ledger

Before writing XML, record the material contract for each case:

| Concern            | Evidence to capture                                                   |
| ------------------ | --------------------------------------------------------------------- |
| Entry event        | Payload, attributes, variables, media type, and source semantics      |
| Dependencies       | Responses or errors controlled at external boundaries                 |
| Outcome            | Payload, attributes, variables, error type, or caller/source response |
| Interactions       | Calls that are themselves part of the contract                        |
| State and delivery | Writes, idempotency, acknowledgement, redelivery, or recovery         |
| Observability      | Correlation, safe logs, metrics, or operational status                |

Choose cases from actual behavior: success, meaningful alternatives, invalid input, dependency
failure, terminal error disposition, retry exhaustion, state/replay behavior, and source delivery
semantics where those paths exist. A separate test for every flow is not inherently useful.

## Build a faithful Mule event

Set the payload, attributes, variables, and media type expected at the real entry boundary. A JSON
string is not equivalent to an object, and an HTTP request, queue message, scheduler event, or
connector callback can expose different attributes and acknowledgement behavior. Keep fixtures
synthetic, minimal, and representative of the current project contract.

## Mock boundaries deliberately

Mock external or nondeterministic boundaries when isolation is required. Prefer the narrowest
selector that identifies the intended operation without depending on incidental implementation
detail. Do not mock every processor: doing so can replace the behavior under test with the test's own
assumptions.

Use interaction verification when the call itself matters—for example, preventing a duplicate write
or proving a terminal notification. Otherwise assert the observable outcome and allow internal
refactoring.

## Assert outcomes and failure disposition

Assert the complete material outcome: value shape and media type, propagated variables or
attributes, classified Mule error, caller/source result, side effects, and state transitions. For
error paths, distinguish propagation from continuation and verify retry, acknowledgement,
redelivery, quarantine, or manual-recovery behavior rather than merely expecting an exception.

Stateful and source-driven paths may require explicit setup and cleanup. Keep tests independent;
never rely on suite order or state left by another test.

## Focused and full execution

Run the smallest relevant suite or test while iterating, then run the repository-required full suite
before release. Treat failures according to evidence:

- **Product regression:** the implemented behavior violates the current contract.
- **Stale expectation:** the contract changed intentionally but the test did not.
- **Selector mismatch:** a mock or verification no longer targets the intended boundary.
- **Fixture mismatch:** the event shape, type, media type, or attributes are inaccurate.
- **Environment/tooling failure:** Maven, licensing, dependency resolution, or runtime setup failed.
- **Flaky/shared state:** timing, ordering, ports, files, or persistent state leak across tests.

Never disable, weaken, or skip a required test merely to obtain a passing build.

## Coverage and Test Recorder

Coverage shows which executable structures were reached; it does not prove that results, failure
disposition, delivery semantics, or state transitions were correct. Use uncovered paths to guide
investigation, not as a universal quality score.

Test Recorder output is a starting point. Review generated fixtures, selectors, assertions, secret
handling, environment assumptions, and state cleanup before treating a recorded test as durable.

## Review checklist

- [ ] The test names a behavior and meaningful scenario.
- [ ] The input event matches the real boundary, including type and media type.
- [ ] Mocks control only necessary boundaries with stable selectors.
- [ ] Assertions prove observable outcomes; verifications prove contractually relevant calls.
- [ ] Error, retry, state, acknowledgement, and recovery behavior is tested where material.
- [ ] Fixtures are synthetic and contain no secret or prior-project data.
- [ ] Tests are independent and leave no shared state behind.
- [ ] Focused and required full-suite commands and results are reported.

**See also:** [Error Handling](error-handling.md) · [CI/CD](ci-cd.md) ·
[Rules Catalog](rules-catalog.md)
