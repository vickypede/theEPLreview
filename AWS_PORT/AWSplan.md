# The EPL Review: Advanced AWS Learning Replica

This document serves as your learning blueprint for building an AWS replica of *The EPL Review*. The goal is **exposure, not cost efficiency**. You will manually provision and connect core AWS services to understand enterprise-grade cloud architecture.

> [!CAUTION]
> **Strictly a Learning Lab**: The production version of *The EPL Review* will **NOT** be ported to this AWS architecture. This is entirely an educational playground for you to build and tear down. 
> 
> **No Custom Domain**: You will not be migrating your Route53 domain. Your entry point to view the site will simply be the raw DNS address provided by the Application Load Balancer (ALB).

---

## 🏷️ Global Naming Convention
To avoid confusion while manually connecting 20+ resources, you will use the `epl-lab-` prefix for **every single resource** you create.

---

## 🛑 Phase 0: Billing Guardrails & Teardown Checklist

Before building anything, ensure you protect yourself from runaway costs.

### 1. Set AWS Budgets
- Go to **AWS Budgets > Create Budget**.
- Create 3 Zero-Spend or custom budget alerts at **$10, $25, and $50**.
- Have them alert your email immediately if forecasted or actual spend crosses the threshold.

### 2. Teardown Checklist & Verification
When you are done with this lab (in a day or two), you **must manually delete these resources** as they bill by the hour even if nobody uses the site. *Never close your laptop until you have manually verified the following consoles:*
- [ ] **NAT Gateway** (`epl-lab-nat-1a`): Verify 0 available. (~$32/mo)
- [ ] **Elastic IPs**: Verify 0 allocated.
- [ ] **Application Load Balancer** (`epl-lab-alb`): Verify 0 active ALBs.
- [ ] **ECS Services**: Verify Desired Count is 0 or the service is deleted.
- [ ] **CloudWatch Log Groups**: Delete all `/aws/lambda/` and `/ecs/` log groups.
- [ ] **ECR Image Repositories** (`epl-lab-ecr-frontend`): Empty and delete the repo.
- [ ] **Secrets Manager Secrets**: Schedule `epl-lab-secret-firecrawl` for deletion.

---

## 🏛️ Architecture Overview

```mermaid
architecture-beta
    group aws(cloud)[AWS Cloud]

    group vpc(cloud)[epl-lab-vpc: 10.0.0.0/16] in aws
    
    group pubA(cloud)[epl-lab-subnet-public-1a] in vpc
    group pubB(cloud)[epl-lab-subnet-public-1b] in vpc
    
    group privAppA(cloud)[epl-lab-subnet-private-app-1a] in vpc
    group privAppB(cloud)[epl-lab-subnet-private-app-1b] in vpc

    service igw(internet)[epl-lab-igw] in vpc
    service alb(server)[epl-lab-alb] in pubA
    service nat(server)[epl-lab-nat-1a] in pubA
    service ddbep(internet)[epl-lab-vpce-ddb] in vpc
    
    service ecs(server)[epl-lab-ecs-service] in privAppA
    service sqs(database)[epl-lab-sqs-ingestion] in aws
    service event(server)[epl-lab-rule-cron] in aws
    service master(server)[epl-lab-lambda-master] in privAppA
    service worker(server)[epl-lab-lambda-worker] in privAppB
    
    service ddb(database)[epl-lab-data-table] in aws
    service cw(database)[CloudWatch Alarms] in aws

    igw:R -- L:alb
    igw:R -- L:nat
    alb:R -- L:ecs
    ecs:R -- L:ddbep
    ddbep:R -- L:ddb
    
    event:R -- L:master
    master:R -- L:sqs
    sqs:R -- L:worker
    worker:R -- L:ddbep
    worker:R -- L:nat
    worker:R -- L:cw
```

---

## 🛠️ Phase 1: The Network Foundation (VPC)
*Goal: Create an isolated network environment with proper internet routing.*

1. **Create the VPC**: Navigate to **VPC > Your VPCs > Create VPC**. Name: `epl-lab-vpc`. CIDR: `10.0.0.0/16`.
2. **Create 4 Subnets** (Split across 2 Availability Zones):
   - **Public Subnet 1**: `epl-lab-subnet-public-1a` (`10.0.0.0/24`)
   - **Public Subnet 2**: `epl-lab-subnet-public-1b` (`10.0.1.0/24`)
   - **Private App Subnet 1**: `epl-lab-subnet-private-app-1a` (`10.0.2.0/24`)
   - **Private App Subnet 2**: `epl-lab-subnet-private-app-1b` (`10.0.3.0/24`)
3. **Gateways & Routing**
   - **Internet Gateway**: Create `epl-lab-igw`. Attach to `epl-lab-vpc`.
   - **NAT Gateway**: Create `epl-lab-nat-1a` in `epl-lab-subnet-public-1a`. Allocate an Elastic IP. 
   - **Public Route Table**: Create `epl-lab-rt-public`. Route `0.0.0.0/0` -> `epl-lab-igw`. Attach to both Public Subnets.
   - **Private Route Table**: Create `epl-lab-rt-private`. Route `0.0.0.0/0` -> `epl-lab-nat-1a`. Attach to both Private App Subnets.
4. **DynamoDB VPC Gateway Endpoint**
   - Create `epl-lab-vpce-ddb` (Gateway Endpoint) and attach it to `epl-lab-rt-private`.

---

## 💾 Phase 2: True Single-Table DynamoDB Design
*Goal: Port Firestore to DynamoDB using advanced enterprise NoSQL access patterns.*

1. Navigate to **DynamoDB > Tables > Create Table**.
2. **Table Configuration**:
   - **Name**: `epl-lab-data-table`
   - **Partition Key (PK)**: `PK` (String)
   - **Sort Key (SK)**: `SK` (String)

3. **Global Secondary Index (GSI)**:
   - **Name**: `GlobalNewsIndex`
   - **Partition Key**: `GSI1PK` (String)
   - **Sort Key**: `GSI1SK` (String)

4. **Data Modeling Rules**:
   - **Sources**: `PK="SOURCE"`, `SK="SOURCE#<id>"`
   - **Clubs**: `PK="CLUB"`, `SK="CLUB#<slug>"`
   - **Articles**: `PK="ARTICLE#<id>"`, `SK="METADATA"`. Set `GSI1PK="ARTICLE"`, `GSI1SK="<publishedAt>#<articleId>"` for the `GlobalNewsIndex`.

5. **Many-to-Many Relationships**:
   - `PK="CLUB#<slug>"`, `SK="ARTICLE#<publishedAt>#<articleId>"`
   - **Crucial Note**: Denormalize (duplicate) the article's `title` and `url` directly onto this Link item to avoid N+1 queries.

---

## ⚙️ Phase 3: Decoupled Scraping Engine
*Goal: Break down the monolithic script into a scalable worker queue.*

1. **Amazon SQS Queue**
   - Create a Standard Queue named `epl-lab-sqs-ingestion`.
   - Set up a Dead Letter Queue (DLQ) named `epl-lab-sqs-ingestion-dlq`.
2. **"Master" Lambda Function**
   - Create `epl-lab-lambda-master` attached to `epl-lab-subnet-private-app-1a` and `1b`.
   - Logic: Query DynamoDB for `PK="SOURCE"`. Push to SQS.
3. **Amazon EventBridge (Cron)**
   - Rule Name: `epl-lab-rule-cron`. Schedule: `cron(0 2 * * ? *)`.
   - Target: `epl-lab-lambda-master`.
4. **"Worker" Lambda Function**
   - Create `epl-lab-lambda-worker` attached to the private subnets.
   - Trigger: `epl-lab-sqs-ingestion`.
   - **Idempotency Rule**: Use DynamoDB conditional writes (only write if the URL hash doesn't exist) to avoid duplicating articles on SQS retries.

---

## 🔒 Phase 4: Security & Least-Privilege IAM
*Goal: Secure API keys and restrict resource access.*

1. **Secrets Manager**: Store your API key as `epl-lab-secret-firecrawl`.
2. **IAM Roles**: 
   - **Lambda Role**: Create `epl-lab-role-lambda-execution`. Attach `AWSLambdaVPCAccessExecutionRole`, `AmazonDynamoDBFullAccess`, `AmazonSQSFullAccess`.
   - **ECS Task Role**: Create `epl-lab-role-ecs-task`. Attach `AmazonDynamoDBReadOnlyAccess`.

---

## 🖥️ Phase 5: Containerizing the Next.js Frontend
*Goal: Build the Next.js App Router for ECS deployment.*

1. **Dockerfile Configuration** in the `app/` directory:
   ```dockerfile
   FROM node:22-alpine
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   RUN npm run build
   EXPOSE 3000
   CMD ["npm", "start"]
   ```
2. **Frontend Refactoring Required**: Rewrite Firebase Client fetches into **Next.js React Server Components (RSC)** so the AWS SDK (`@aws-sdk/client-dynamodb`) runs securely on the ECS server.

---

## 🌐 Phase 6: Hosting the Frontend (ALB + ECS Fargate)
*Goal: Serve the container to the web.*

1. **Amazon ECR**: Create a repository `epl-lab-ecr-frontend`. Build and push your image.
2. **Application Load Balancer (ALB)**: Create `epl-lab-alb` (Internet-facing) in `epl-lab-subnet-public-1a` and `1b`. Create a Target Group named `epl-lab-tg-frontend`.
3. **ECS Cluster & Task**: 
   - Create a Fargate cluster `epl-lab-ecs-cluster`.
   - Create a Task Definition `epl-lab-task-frontend` pointing to your ECR image. Attach `epl-lab-role-ecs-task`.
   - Run the service `epl-lab-ecs-service` in your private subnets, linked to `epl-lab-tg-frontend`.

---

## 🚨 Phase 7: Monitoring & Alarms (CloudWatch)
*Goal: Build enterprise-grade alerting.*

1. Navigate to **CloudWatch > Alarms > Create Alarm**.
2. **Setup the following 3 Alarms**:
   - `epl-lab-alarm-lambda-errors`: Alarm if `epl-lab-lambda-master` `Errors` > 0.
   - `epl-lab-alarm-dlq-depth`: Alarm if `epl-lab-sqs-ingestion-dlq` `ApproximateNumberOfMessagesVisible` > 0.
   - `epl-lab-alarm-ecs-health`: Alarm if `epl-lab-alb` `UnHealthyHostCount` > 0.
