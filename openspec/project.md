---
project-type: microservice
github-repo: ika100/e2e-counter-service
docker-registry: ghcr.io/ika100
docker-image: ghcr.io/ika100/e2e-counter-service
gitops-repo: https://github.com/ika100/e2e-gitops.git
gitops-values-path: apps/counter-service/values.yaml
base-branch: main
version: 0.0.0
---

# counter-service

REST microservice — tracks named in-memory counters via POST/GET /counters/:name

## Links
- Platform: [platform.yaml](../../platform.yaml)
- GitHub: https://github.com/ika100/e2e-counter-service
