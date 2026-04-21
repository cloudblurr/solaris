# NimbusAI Deployment Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        GitHub Repository                         │
│                    (cloudblurr/NimbusAI)                         │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Source Code                                             │   │
│  │  - app/                                                  │   │
│  │  - components/                                           │   │
│  │  - lib/                                                  │   │
│  │  - Dockerfile                                            │   │
│  │  - package.json                                          │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  GitHub Actions Workflow                                 │   │
│  │  (.github/workflows/build-and-push.yml)                  │   │
│  │                                                           │   │
│  │  Triggers on: push to main                               │   │
│  │  - Build Docker image (multi-stage)                      │   │
│  │  - Multi-platform (amd64, arm64)                         │   │
│  │  - Tag image (latest, branch, sha)                       │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              GitHub Container Registry (GHCR)                    │
│                                                                   │
│  ghcr.io/cloudblurr/nimbusai:latest                             │
│  ghcr.io/cloudblurr/nimbusai:main                               │
│  ghcr.io/cloudblurr/nimbusai:sha-abc123                         │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Docker Image (~300MB)                                   │   │
│  │  - Node.js 20 Alpine base                                │   │
│  │  - Next.js application                                   │   │
│  │  - All dependencies                                      │   │
│  │  - Non-root user                                         │   │
│  │  - Health checks                                         │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Cloudflare Container                          │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Container Runtime                                       │   │
│  │  - Pulls latest image from GHCR                          │   │
│  │  - Runs on Cloudflare infrastructure                     │   │
│  │  - Port 3000 exposed                                     │   │
│  │  - Environment variables configured                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  DNS Configuration                                       │   │
│  │  - CNAME: sol.terragravity.cloud                         │   │
│  │  - Target: nimbusai-prod.containers.cloudflare.com       │   │
│  │  - Proxied: Yes (orange cloud)                           │   │
│  │  - TTL: Automatic                                        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  SSL/TLS Configuration                                   │   │
│  │  - Mode: Full                                            │   │
│  │  - Certificate: Automatic (Cloudflare)                   │   │
│  │  - Always Use HTTPS: Enabled                             │   │
│  │  - HSTS: Enabled                                         │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Performance & Security                                  │   │
│  │  - Brotli Compression: Enabled                           │   │
│  │  - Cache Level: Cache Everything                         │   │
│  │  - Edge Cache TTL: 4 hours                               │   │
│  │  - DDoS Protection: Enabled                              │   │
│  │  - WAF: Available                                        │   │
│  │  - Rate Limiting: Configurable                           │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Global CDN & Users                            │
│                                                                   │
│  https://sol.terragravity.cloud                                 │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  User Request Flow                                       │   │
│  │  1. User → Cloudflare Edge (nearest location)            │   │
│  │  2. Check cache (4-hour TTL)                             │   │
│  │  3. If miss → Container (origin)                         │   │
│  │  4. Response → Compress (Brotli)                         │   │
│  │  5. Response → User (cached)                             │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      User Browser                                │
│                                                                   │
│  GET https://sol.terragravity.cloud/api/...                     │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   Cloudflare Edge Network                        │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  1. Receive Request                                      │   │
│  │  2. Check Cache (4-hour TTL)                             │   │
│  │  3. Apply Security Rules (WAF, Rate Limit)               │   │
│  │  4. Compress Response (Brotli)                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  Cache Hit (80%+)          Cache Miss                            │
│       ↓                          ↓                                │
│  Return cached          Forward to origin                        │
│  response               (container)                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  Cloudflare Container                            │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Next.js Application                                     │   │
│  │  - Process request                                       │   │
│  │  - Query database if needed                              │   │
│  │  - Generate response                                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Database (PostgreSQL)                                   │   │
│  │  - User data                                             │   │
│  │  - Application state                                     │   │
│  │  - Marketplace entries                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   Response to User                               │
│                                                                   │
│  1. Response generated                                           │
│  2. Compressed (Brotli)                                          │
│  3. Cached at edge (4 hours)                                     │
│  4. Sent to user                                                 │
│  5. Browser renders                                              │
└─────────────────────────────────────────────────────────────────┘
```

## Deployment Process Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Developer Workflow                            │
│                                                                   │
│  1. Make code changes                                            │
│  2. Commit to main branch                                        │
│  3. Push to GitHub                                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  GitHub Actions Triggered                        │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Build Stage                                             │   │
│  │  - Checkout code                                         │   │
│  │  - Setup Docker Buildx                                   │   │
│  │  - Build image (multi-stage)                             │   │
│  │  - Multi-platform (amd64, arm64)                         │   │
│  │  - Tag image                                             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Push Stage                                              │   │
│  │  - Authenticate with GHCR                                │   │
│  │  - Push image tags                                       │   │
│  │  - Update registry metadata                              │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│              GitHub Container Registry                           │
│                                                                   │
│  Image available at:                                             │
│  ghcr.io/cloudblurr/nimbusai:latest                             │
│  ghcr.io/cloudblurr/nimbusai:main                               │
│  ghcr.io/cloudblurr/nimbusai:sha-<commit>                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  Cloudflare Container                            │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  1. Detect new image                                     │   │
│  │  2. Pull latest from GHCR                                │   │
│  │  3. Stop old container                                   │   │
│  │  4. Start new container                                  │   │
│  │  5. Health check                                         │   │
│  │  6. Route traffic                                        │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   Live at Production URL                         │
│                                                                   │
│  https://sol.terragravity.cloud                                 │
│                                                                   │
│  ✓ New code deployed                                             │
│  ✓ Zero downtime                                                 │
│  ✓ Automatic rollback on failure                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Container Layers Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Docker Image Layers                           │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Layer 1: Base Image                                     │   │
│  │  node:20-alpine (~150MB)                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Layer 2: Production Dependencies                        │   │
│  │  npm ci --only=production (~50MB)                        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Layer 3: Built Application                              │   │
│  │  npm run build (~80MB)                                   │   │
│  │  - Next.js compiled                                      │   │
│  │  - Static assets                                         │   │
│  │  - Optimized code                                        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Layer 4: Runtime Configuration                          │   │
│  │  - Non-root user                                         │   │
│  │  - Health checks                                         │   │
│  │  - Environment variables                                 │   │
│  │  - Entry point (dumb-init)                               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  Total Size: ~300MB (optimized)                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Security Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Request                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   Cloudflare Security                            │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  1. DDoS Protection                                      │   │
│  │     - Rate limiting                                      │   │
│  │     - Bot detection                                      │   │
│  │     - Traffic analysis                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  2. Web Application Firewall (WAF)                       │   │
│  │     - SQL injection protection                           │   │
│  │     - XSS protection                                     │   │
│  │     - Custom rules                                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  3. SSL/TLS Encryption                                   │   │
│  │     - HTTPS only                                         │   │
│  │     - Automatic certificate                              │   │
│  │     - TLS 1.2+                                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  4. Rate Limiting                                        │   │
│  │     - Per IP                                             │   │
│  │     - Per endpoint                                       │   │
│  │     - Configurable thresholds                            │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Container Security                            │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  1. Non-root User                                        │   │
│  │     - Runs as nextjs:1001                                │   │
│  │     - Limited permissions                                │   │
│  │  2. Read-only Filesystem                                 │   │
│  │     - Prevents unauthorized changes                      │   │
│  │  3. Resource Limits                                      │   │
│  │     - CPU limits                                         │   │
│  │     - Memory limits                                      │   │
│  │  4. Health Checks                                        │   │
│  │     - Automatic restart on failure                       │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   Application Security                           │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  1. NextAuth.js                                          │   │
│  │     - Session management                                 │   │
│  │     - CSRF protection                                    │   │
│  │  2. Environment Variables                                │   │
│  │     - Secrets not in code                                │   │
│  │     - Encrypted in transit                               │   │
│  │  3. Database Security                                    │   │
│  │     - Parameterized queries                              │   │
│  │     - Connection pooling                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Performance Optimization Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Request                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   Cloudflare Edge Cache                          │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Cache Hit (80%+)                                        │   │
│  │  - Serve from nearest edge location                      │   │
│  │  - TTL: 4 hours                                          │   │
│  │  - Compression: Brotli                                   │   │
│  │  - Response time: <100ms                                 │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
│  Cache Miss                                                      │
│       ↓                                                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Forward to Origin                                       │   │
│  │  - Container processes request                           │   │
│  │  - Database query if needed                              │   │
│  │  - Generate response                                     │   │
│  │  - Cache response                                        │   │
│  │  - Compress (Brotli)                                     │   │
│  │  - Return to user                                        │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Optimization Techniques                       │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  1. Image Optimization                                   │   │
│  │     - Cloudflare Polish                                  │   │
│  │     - WebP conversion                                    │   │
│  │  2. Minification                                         │   │
│  │     - HTML, CSS, JS minified                             │   │
│  │  3. Compression                                          │   │
│  │     - Brotli (better than gzip)                          │   │
│  │  4. HTTP/2 & HTTP/3                                      │   │
│  │     - Multiplexing                                       │   │
│  │     - Server push                                        │   │
│  │  5. Caching Headers                                      │   │
│  │     - Cache-Control                                      │   │
│  │     - ETag                                               │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Monitoring & Observability Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Application Metrics                           │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Container Logs                                          │   │
│  │  - Application output                                    │   │
│  │  - Error tracking                                        │   │
│  │  - Request logging                                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Health Checks                                           │   │
│  │  - HTTP endpoint monitoring                              │   │
│  │  - Automatic restart on failure                          │   │
│  │  - Status reporting                                      │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   Cloudflare Analytics                           │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Traffic Metrics                                         │   │
│  │  - Request count                                         │   │
│  │  - Bandwidth usage                                       │   │
│  │  - Geographic distribution                               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Performance Metrics                                     │   │
│  │  - Cache hit ratio                                       │   │
│  │  - Response time                                         │   │
│  │  - Page speed                                            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Security Metrics                                        │   │
│  │  - Threats blocked                                       │   │
│  │  - DDoS attacks mitigated                                │   │
│  │  - WAF events                                            │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

**Architecture Status**: ✓ Production Ready  
**Last Updated**: April 21, 2026
