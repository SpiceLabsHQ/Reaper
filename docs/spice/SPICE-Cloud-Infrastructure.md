# 🌐 Cloud Infrastructure Standards

> Default regions and naming conventions for Spice Labs cloud resources.

---

## 🗺️ Default Regions

All cloud resources should be created in availability zones nearest Los Angeles while balancing cost. These defaults optimize for both latency and affordability.

| Cloud | Default Region | Location | Rationale |
|-------|---------------|----------|-----------|
| **AWS** | `us-west-2` | Oregon | Cheaper than us-west-1, close to LA |
| **Azure** | `us-west-3` | Arizona | Close to LA and affordable |
| **GCP** | `us-west1` | Oregon | Cost-effective, matches AWS strategy |

### When to Override

Individual projects may specify different regions in their project-level `CLAUDE.md` for:
- **Multi-region deployments**: Global applications requiring presence in multiple regions
- **Data residency compliance**: Legal requirements for data location (GDPR, HIPAA, etc.)
- **Latency-critical applications**: Services requiring sub-10ms latency to specific user populations
- **Service availability**: When specific cloud services aren't available in default regions

---

## 📛 Resource Naming Convention

A consistent naming pattern ensures resources from different projects sort cleanly when listed together.

### Pattern

```
{project}-{env}-{type}-{identifier}
```

### Core Rules

1. **Project-first**: Project name leads so all project resources sort together
2. **Lowercase hyphenated**: Universal compatibility across all cloud providers
3. **Hyphens only**: No underscores, dots, or special characters
4. **Standard environments**: Use `dev`, `staging`, `prod` consistently
5. **Descriptive identifiers**: Brief but meaningful suffix

### Sorting Behavior

When resources from multiple projects are listed alphabetically:

```
api-dev-cache-sessions
api-dev-db-primary
api-prod-cache-sessions
api-prod-db-primary
api-prod-db-replica
dashboard-dev-vm-web01
dashboard-prod-lb-main
dashboard-prod-vm-web01
dashboard-staging-vm-web01
```

Resources naturally group by project, then environment, then type.

---

## 🏷️ Environment Abbreviations

Use these standard abbreviations consistently:

| Abbreviation | Environment | Purpose |
|--------------|-------------|---------|
| `dev` | Development | Local/sandbox development |
| `staging` | Staging | Pre-production testing |
| `prod` | Production | Live customer-facing |

---

## 📏 Length Considerations

No strict character limit is enforced, but be aware:
- **AWS**: Most resources allow 63-255 characters
- **Azure**: Varies by resource (3-63 typical for storage)
- **GCP**: Usually 1-63 characters

Keep project names reasonably short (aim for under 15 characters) to leave room for the full naming pattern.

---

## 🔧 Resource Type Abbreviations

Common abbreviations for the `{type}` segment:

| Type | Resources |
|------|-----------|
| `db` | Databases (RDS, Cloud SQL, Cosmos DB) |
| `cache` | Redis, Memcached, ElastiCache |
| `vm` | Virtual machines, EC2, Compute Engine |
| `lb` | Load balancers |
| `fn` | Functions (Lambda, Cloud Functions) |
| `bucket` | Object storage (S3, GCS, Blob) |
| `queue` | Message queues (SQS, Pub/Sub) |
| `net` | VPCs, subnets, network resources |
| `iam` | IAM roles, policies, service accounts |

---

## 🏷️ Tagging Standards

All cloud resources should include these tags/labels:

| Tag Key | Example Value | Purpose |
|---------|---------------|---------|
| `project` | `api` | Cost allocation, filtering |
| `environment` | `prod` | Environment identification |
| `owner` | `platform-team` | Ownership and contact |
| `managed-by` | `terraform` | IaC tracking |

---

## 📚 Cross-References

- **CI/CD & OIDC**: See @SPICE.md for Bitbucket Pipelines OIDC setup
- **Agent Usage**: Use `cloud-architect` agent for infrastructure design decisions

---

*Last updated: 2025-12-20*
