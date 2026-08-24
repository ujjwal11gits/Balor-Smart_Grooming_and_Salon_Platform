# Part 8: Cloud Architecture, DevOps & Deployment Infrastructure

> **Target Role:** SDE 1 / SDE 2 (Product MNCs)  
> **Infrastructure Focus:** AWS EC2, Nginx, PM2, Docker, CI/CD, Microservices vs Monolith

---

## 📌 Table of Contents
1. [Deployment Architecture: Nginx + PM2 + Node + AWS EC2](#q1-how-is-the-deployment-infrastructure-architected-for-balor)
2. [Nginx Reverse Proxy & SSL Termination Deep Dive](#q2-how-do-you-configure-nginx-as-a-reverse-proxy-and-ssl-terminator)
3. [PM2 Process Manager & Zero-Downtime Reloads](#q3-how-does-pm2-manage-nodejs-processes-in-production)
4. [Docker Containers vs Virtual Machines](#q4-tech-stack-comparison-docker-containers-vs-virtual-machines)
5. [Dockerfile Optimization & Multi-Stage Builds](#q5-how-do-you-optimize-a-dockerfile-for-a-nodejs-application)
6. [Monolith vs Microservices Architecture](#q6-tech-stack-comparison-monolithic-architecture-vs-microservices)
7. [AWS Compute Services: EC2 vs ECS vs Lambda](#q7-tech-stack-comparison-aws-ec2-vs-aws-ecs-vs-aws-lambda)
8. [Blue-Green vs Canary vs Rolling Deployments](#q8-tech-stack-comparison-blue-green-vs-canary-vs-rolling-deployments)
9. [CI/CD Pipeline Design with GitHub Actions](#q9-how-do-you-design-an-automated-cicd-pipeline-for-nodejs-and-react)
10. [HTTPS Setup with Certbot & Let's Encrypt](#q10-how-do-you-provision-free-ssl-certificates-using-lets-encrypt)
11. [Infrastructure as Code (IaC): Terraform vs CloudFormation](#q11-what-is-infrastructure-as-code-iac-and-why-use-terraform)
12. [Application Performance Monitoring (APM) & Metrics](#q12-how-do-you-monitor-production-backend-health-and-latency)
13. [Centralized Logging Architecture (ELK / Loki)](#q13-how-do-you-centralize-application-logs-in-a-distributed-system)
14. [Kubernetes Liveness vs Readiness Probes](#q14-what-is-the-difference-between-liveness-and-readiness-probes)
15. [Secrets Management Best Practices](#q15-how-do-you-manage-sensitive-environment-secrets-in-production)

---

### Q1: How is the Deployment Infrastructure architected for Balor?

**Difficulty:** Practical Deployment  
**Importance:** 🔥🔥🔥🔥🔥 (Used in `docs/aws_deployment_guide.md`)

```
   [ User Browser ]
          │ (HTTPS :443)
          ▼
   [ AWS EC2 Instance ]
   ┌────────────────────────────────────────────────────────┐
   │ Nginx Reverse Proxy (SSL Termination + Static Host)    │
   └───────────────────────────┬────────────────────────────┘
                               │ HTTP Proxy Pass (:5000)
                               ▼
   ┌────────────────────────────────────────────────────────┐
   │ PM2 Process Manager (Cluster Mode: 4 Worker Instances) │
   └───────────────────────────┬────────────────────────────┘
                               │
                               ▼
                    [ MongoDB Atlas Cluster ]
```

---

### Q2: How do you configure Nginx as a Reverse Proxy and SSL Terminator?

**Difficulty:** DevOps Infrastructure  
**Importance:** 🔥🔥🔥🔥🔥

```nginx
# /etc/nginx/sites-available/balor.conf
server {
    listen 443 ssl http2;
    server_name api.balorgrooming.com;

    ssl_certificate /etc/letsencrypt/live/api.balorgrooming.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.balorgrooming.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:5000; # Route to local Node server
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

### Q3: How does PM2 manage Node.js processes in production?

**Difficulty:** Production Ops  
**Importance:** 🔥🔥🔥🔥

- **Process Clustering:** `pm2 start server.js -i max` uses Node's `cluster` module to spawn worker instances matching available CPU cores.
- **Zero-Downtime Reload (`pm2 reload all`):** Reloads workers sequentially. Worker 1 reloads while Workers 2-4 handle live traffic, eliminating downtime.
- **Crash Recovery:** PM2 automatically restarts instances if a process uncaught exception occurs.

---

### Q4: Tech Stack Comparison: Docker Containers vs Virtual Machines

**Difficulty:** Cloud Virtualization  
**Importance:** 🔥🔥🔥🔥🔥

#### 1. What is a Virtual Machine (VM)?
Hardware-level virtualization managed by a Hypervisor (e.g. VMware, KVM).
- **How it works:** Each VM includes a full **Guest Operating System**, virtualized hardware drivers, and dedicated RAM/CPU allocations.
- **Tradeoffs:** High isolation and security, but heavy resource footprint (GBs of RAM) and slow boot times (minutes).

#### 2. What is a Docker Container?
OS-level virtualization using Linux Kernel features (**`namespaces`** for isolation and **`cgroups`** for resource limits).
- **How it works:** Containers share the host operating system's kernel, packaging strictly application code and runtime dependencies.
- **Tradeoffs:** Millisecond startup times, minimal memory footprint (MBs), but relies on shared host kernel.

```
VIRTUAL MACHINES                           DOCKER CONTAINERS
┌──────────────────────────┐               ┌──────────────────────────┐
│ App A   │ App B          │               │ App A   │ App B          │
├─────────┼────────────────┤               ├─────────┼────────────────┤
│ Guest OS│ Guest OS       │               │ Container Engine (Docker)│
├─────────┴────────────────┤               ├──────────────────────────┤
│ Hypervisor (VMware/KVM)  │               │ Shared Host OS Kernel    │
└──────────────────────────┘               └──────────────────────────┘
```

---

#### 3. Detailed Comparison:

| Metric | Virtual Machine (VM) | Docker Container |
| :--- | :--- | :--- |
| **Virtualization** | Hardware-level (Includes full Guest OS). | **OS-level** (Shares Host Kernel via `cgroups` & `namespaces`). |
| **Startup Time** | Minutes | **Milliseconds** |
| **Resource Overhead**| High (Gigabytes of RAM per VM). | Minimal (Megabytes per container). |

---

### Q5: How do you optimize a Dockerfile for a Node.js application?

**Difficulty:** Containerization  
**Importance:** 🔥🔥🔥🔥

Use **Multi-Stage Builds** and small base images (`node:20-alpine`):

```dockerfile
# Stage 1: Build dependencies
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Minimal Production Image
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 5000
USER node  # 👈 Security: Run as non-root user
CMD ["node", "server.js"]
```

---

### Q6: Tech Stack Comparison: Monolithic Architecture vs Microservices

**Difficulty:** Enterprise HLD  
**Importance:** 🔥🔥🔥🔥🔥

#### 1. What is a Monolithic Architecture? (Used in Balor)
A unified application codebase deployed as a single deployment artifact.
- **Pros:** Simple deployment pipeline, single database, straightforward local development, zero inter-service network latency.
- **Cons:** Codebase can become coupled; scaling requires replicating the entire application instance.

#### 2. What is Microservices Architecture?
Splits the application domain into small, independently deployable services that communicate via HTTP/gRPC or Message Queues.
- **Pros:** Autonomous team ownership, independent service scaling, technological flexibility per service.
- **Cons:** High operational complexity (requires Kubernetes, distributed tracing, API gateways, and eventual consistency).

---

#### 3. Summary Comparison:

| Attribute | Modular Monolith (Balor) | Microservices |
| :--- | :--- | :--- |
| **Codebase** | Single repository, unified build. | Distributed independently deployed services. |
| **Deployment** | Simple single artifact deployment. | Complex container orchestration (Kubernetes). |
| **Data Consistency**| Local DB transactions possible. | Eventual consistency via Distributed Transactions (Saga Pattern). |
| **Team Scaling** | Best for small-to-medium teams (<20 devs). | Best for large organizations (100+ devs). |

---

### Q7: Tech Stack Comparison: AWS EC2 vs AWS ECS vs AWS Lambda

**Difficulty:** Cloud Compute  
**Importance:** 🔥🔥🔥🔥

#### 1. What is AWS EC2? (Elastic Compute Cloud)
Virtual machines in the AWS cloud. Provides full root access and total OS control, but requires manual OS patching and scaling setup.

#### 2. What is AWS ECS? (Elastic Container Service)
Fully managed container orchestration service to run and scale Docker container clusters automatically (using EC2 or AWS Fargate serverless compute).

#### 3. What is AWS Lambda? (Serverless)
Event-driven serverless compute platform. Runs code automatically in response to HTTP API Gateway triggers, scaling to zero with millisecond billing.

---

### Q8: Tech Stack Comparison: Blue-Green vs Canary vs Rolling Deployments

**Difficulty:** Deployment Strategies  
**Importance:** 🔥🔥🔥🔥

#### 1. What is Rolling Deployment?
Gradually updates application instances node-by-node in a cluster until all instances run the new version. Zero extra hardware cost, but old and new versions run concurrently.

#### 2. What is Blue-Green Deployment?
Provisions 2 identical environments: **Blue** (Active) and **Green** (Idle New Version). Once Green passes verification tests, router traffic is instantly switched from Blue to Green. Enables instant rollback.

#### 3. What is Canary Deployment?
Routes a tiny fraction (e.g. 5%) of live production traffic to the new release to monitor error metrics before gradually rolling out to 100% of users.

---

### Q9: How do you design an automated CI/CD pipeline for Node.js and React?

**Difficulty:** DevOps CI/CD  
**Importance:** 🔥🔥🔥🔥

```
[ Push to Main Branch ]
          │
          ▼
   [ GitHub Actions Runner ]
   ├── Step 1: Run ESLint & Code Formatting
   ├── Step 2: Run Automated Unit Tests (Jest)
   ├── Step 3: Build Vite Production Assets
   └── Step 4: Deploy Artifact via SSH to AWS EC2 & trigger `pm2 reload`
```

---

### Q10: How do you provision free SSL certificates using Let's Encrypt?

**Difficulty:** Operations  
**Importance:** 🔥🔥🔥

Install **Certbot** on Linux server: `sudo certbot --nginx -d api.balorgrooming.com`. Certbot automatically modifies Nginx configs and creates a `systemd` cron job for automatic 90-day SSL renewals.

---

### Q11: What is Infrastructure as Code (IaC) and why use Terraform over CloudFormation?

**Difficulty:** DevOps HLD  
**Importance:** 🔥🔥🔥

#### 1. What is Infrastructure as Code (IaC)?
Managing and provisioning cloud resources (VPCs, EC2, S3, RDS) using machine-readable configuration files rather than manual web console clicks.

#### 2. Terraform vs CloudFormation:
- **Terraform:** Multi-cloud IaC tool created by HashiCorp using HCL (HashiCorp Configuration Language). Works across AWS, GCP, Azure, and custom providers.
- **AWS CloudFormation:** AWS-native IaC service using JSON/YAML templates. Deeply integrated into AWS, but vendor-locked to Amazon Web Services.

---

### Q12: How do you monitor production backend health and latency?

**Difficulty:** Observability  
**Importance:** 🔥🔥🔥

Implement APM (Application Performance Monitoring) tools like **Sentry** (Error tracking), **Prometheus + Grafana** (Metrics for CPU/RAM/HTTP status rates), and health endpoints (`/healthz`).

---

### Q13: How do you centralize application logs in a distributed system?

**Difficulty:** Logging Infrastructure  
**Importance:** 🔥🔥🔥

Use log aggregators: **ELK Stack (Elasticsearch, Logstash, Kibana)** or **Grafana Loki**. Server instances send JSON logs via `Fluentd` or `Promtail` agents to a centralized searchable dashboard.

---

### Q14: What is the difference between Liveness and Readiness Probes in Kubernetes?

**Difficulty:** Kubernetes / Cloud  
**Importance:** 🔥🔥🔥

#### 1. What is a Liveness Probe? (`/healthz`)
Checks if the container application process is healthy and running.
- **Failure Action:** If the liveness probe fails, Kubernetes kills the unhealthy container and restarts a new container instance.

#### 2. What is a Readiness Probe? (`/readyz`)
Checks if the container application is ready to accept incoming client network traffic (e.g. database connections and Redis caches are fully initialized).
- **Failure Action:** If the readiness probe fails, Kubernetes removes the container IP from load balancer endpoints until it recovers, without restarting the container.

---

### Q15: How do you manage sensitive environment secrets in production?

**Difficulty:** Security DevOps  
**Importance:** 🔥🔥🔥

Never commit `.env` files to Git repositories! Store secrets in managed cloud vaults like **AWS Secrets Manager** or **HashiCorp Vault**, injected into process environment variables at runtime.

---
