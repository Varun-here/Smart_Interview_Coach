# Smart Interview Coach — Monorepo Scaffold (AWS + Express + Next.js)

This is a minimal, production-leaning scaffold to get you started quickly.

## Structure
```
smart-interview-coach/
  infra/                # Terraform (VPC, RDS Postgres, S3, Cognito skeleton)
  apps/
    web/                # Next.js (frontend)
    api/                # Express (backend)
    lambda-processor/   # AWS Lambda (S3 -> Transcribe+Comprehend -> Postgres)
  packages/
    shared/             # Shared TS types/utilities
```

## Quick Start (Local Dev)
1) **Postgres (Docker):**
```bash
docker run --name sic-pg -e POSTGRES_USER=app -e POSTGRES_PASSWORD=app   -e POSTGRES_DB=sic -p 5432:5432 -d postgres:16
```
Apply `apps/api/schema.sql` to your DB.

2) **Install deps (use pnpm or npm):**
```bash
# At repo root
pnpm i  # or: npm i --workspaces
```

3) **Run API:**
```bash
cd apps/api
cp .env.example .env
pnpm dev   # or: npm run dev
```

4) **Run Web:**
```bash
cd ../web
cp .env.local.example .env.local
pnpm dev
```

5) **Lambda (local test):**
```bash
cd ../lambda-processor
pnpm dev  # (simulates handler locally with your env)
```

> **Note:** Terraform under `infra/` is a minimal skeleton. Add your AWS credentials and fill variables before `terraform apply`.

## Environment Variables
- API: see `apps/api/.env.example`
- Web: see `apps/web/.env.local.example`
- Lambda: same as API (DB + AWS region + S3 bucket).

## Deploy (High Level)
- Use Terraform to provision VPC, RDS, S3, Cognito and the Lambda.
- Deploy **API** to your choice (EC2/ECS/Beanstalk/Fargate). For a fast path, use ECS on Fargate.
- Deploy **Web** to Vercel or S3+CloudFront.
- Wire S3 `audio/*` `ObjectCreated` event to the Lambda.
