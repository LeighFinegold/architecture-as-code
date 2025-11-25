---
id: 
title: 
architecture: /Users/leighfinegold/IdeaProjects/architecture-as-code/cli/test_fixtures/getting-started/STEP-3/conference-signup-with-flow.arch.json
---

```json
{
  "unique-id": "k8s-cluster",
  "node-type": "system",
  "name": "Kubernetes Cluster",
  "description": "Kubernetes Cluster with network policy rules enabled",
  "controls": {
    "security": {
      "description": "Security requirements for the Kubernetes cluster",
      "requirements": [
        {
          "requirement-url": "https://calm.finos.org/getting-started/controls/micro-segmentation.requirement.json",
          "$schema": "https://calm.finos.org/getting-started/controls/micro-segmentation.requirement.json",
          "$id": "https://calm.finos.org/getting-started/controls/micro-segmentation.config.json",
          "control-id": "security-001",
          "name": "Micro-segmentation of Kubernetes Cluster",
          "description": "Micro-segmentation in place to prevent lateral movement outside of permitted flows",
          "permit-ingress": true,
          "permit-egress": false
        }
      ]
    }
  }
}
```



