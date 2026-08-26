# Deployment and modernization

## Outcome

The packaged Mule application, selected Java/runtime combination, connectors, policies, properties, and deployment target are compatible—and the team has a tested rollback path.

Deployment compatibility changes over time. Use this page as a checklist, then verify versions in MuleSoft’s current documentation before scheduling a migration.

## Pre-deployment checklist

- [ ] The application builds from a clean checkout.
- [ ] MUnit and relevant integration/contract tests pass.
- [ ] `mule-lint . --profile recommended` has no unreviewed errors.
- [ ] Environment property files are present and placeholders resolve in the target.
- [ ] Secrets are encrypted or supplied by an approved secret store.
- [ ] Connector/module versions support the selected Mule runtime and Java version.
- [ ] API Manager policies and proxies are compatible with the runtime/Java target.
- [ ] Timeouts, reconnection, scaling assumptions, dashboards, and alerts are reviewed.
- [ ] Rollback steps and the previously known-good artifact are available.

## Java and Mule runtime migration

MuleSoft’s current Java support matrix is the source of truth. Mule runtime 4.6 introduced Java 17 support, while later runtimes can have different requirements. Custom connectors, custom Java, third-party libraries, policies, and proxies all need compatibility review—not only the application POM.

A safe migration sequence:

1. Inventory runtime, Java, connectors/modules, custom Java, policies, proxies, and deployment plugin versions.
2. Select a Mule-supported combination from the current matrix.
3. Update connector/module versions before relying on a clean application compile.
4. Build and test in a controlled environment with production-like payload sizes.
5. Compare latency, memory, connection pools, and error behavior.
6. Deploy through the normal promotion path with rollback ready.

Official references:

- [Java support](https://docs.mulesoft.com/general/java-support)
- [Studio Java/runtime compatibility](https://docs.mulesoft.com/studio/compatibility-issues-runtime-java)
- [Deployment options](https://docs.mulesoft.com/runtime-manager/deployment-strategies)

## Choose a deployment target deliberately

CloudHub, CloudHub 2.0, Runtime Fabric, and hybrid/on-premises targets differ in scaling, networking, patching, persistence, and operational ownership. Static analysis cannot choose between them.

Record at least:

| Decision      | Questions                                                                                 |
| ------------- | ----------------------------------------------------------------------------------------- |
| Scaling       | What is one replica/worker expected to handle? How is load distributed?                   |
| Networking    | Which ingress/egress paths, private networks, certificates, and DNS entries are required? |
| State         | Which data must survive a restart or reschedule? Where is it stored?                      |
| Patching      | Who selects runtime/Java patch versions and validates the application?                    |
| Observability | Which logs, metrics, traces, dashboards, and alerts prove health?                         |
| Recovery      | What triggers rollback, and how quickly can the last artifact be restored?                |

Verify deployment capabilities and supported Java versions in MuleSoft’s [deployment options](https://docs.mulesoft.com/runtime-manager/deployment-strategies).

## Environment promotion

Keep the application artifact identical across environments. Supply environment-specific hosts, ports, identifiers, and encrypted secrets through configuration:

```text
development → QA → staging → production
    dev.yaml   qa.yaml  staging.yaml  prod.yaml
```

Do not assume matching filenames prove matching configuration. Validate required keys, secret references, endpoint reachability, and policy configuration for every target.

## What mule-lint can help with

mule-lint can identify selected project hygiene, property coverage, insecure values, Java/DataWeave patterns, and auto-discovery/configuration risks. It cannot validate:

- the actual target environment or permissions;
- deployed API Manager policies;
- connector/runtime compatibility outside what is represented in source;
- production capacity, network reachability, or rollback execution.

See [CI/CD](ci-cd.md), [security](security.md), and [testing](testing.md).
