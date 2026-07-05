# The EPL Review: Advanced AWS Learning Replica

This document serves as your learning blueprint for building an AWS replica of *The EPL Review*. The goal is **exposure, not cost efficiency**. You will manually provision and connect core AWS services to understand enterprise-grade cloud architecture.

> [!CAUTION]
> **Strictly a Learning Lab**: The production version of *The EPL Review* will **NOT** be ported to this AWS architecture. This is entirely an educational playground for you to build and tear down. 
> 
> **No Custom Domain**: You will not be migrating your Route53 domain. Your entry point to view the site will simply be the raw DNS address provided by the Application Load Balancer (ALB).

---

## 🛑 Phase 0: Billing Guardrails & Teardown Checklist

Before building anything, ensure you protect yourself from runaway costs.

### 1. Set AWS Budgets
- Go to **AWS Budgets > Create Budget**.
- Create 3 Zero-Spend or custom budget alerts at **$10, $25, and $50**.
- Have them alert your email immediately if forecasted or actual spend crosses the threshold.

### 2. Teardown Checklist & Verification
When you are done with this lab (in a day or two), you **must manually delete these resources** as they bill by the hour even if nobody uses the site. *Never close your laptop until you have manually verified the following consoles:*
- [ ] **NAT Gateway**: Verify 0 available. (~$32/mo)
- [ ] **Elastic IPs**: Verify 0 allocated.
- [ ] **Application Load Balancer (ALB)**: Verify 0 active ALBs.
- [ ] **ECS Services**: Verify Desired Count is 0 or the service is deleted.
- [ ] **CloudWatch Log Groups**: Delete all `/aws/lambda/` and `/ecs/` log groups.
- [ ] **ECR Image Repositories**: Empty and delete the repo.
- [ ] **Secrets Manager Secrets**: Schedule for deletion.

---

## 🏛️ Architecture Overview

```mermaid
architecture-beta
    group aws(cloud)[AWS Cloud]

    group vpc(cloud)[VPC 10.0.0.0/16] in aws
    
    group pubA(cloud)[Public Subnet A] in vpc
    group pubB(cloud)[Public Subnet B] in vpc
    
    group privAppA(cloud)[Private Subnet A] in vpc
    group privAppB(cloud)[Private Subnet B] in vpc

    service igw(internet)[Internet Gateway] in vpc
    service alb(server)[Application Load Balancer] in pubA
    service nat(server)[NAT Gateway] in pubA
    service ddbep(internet)[DynamoDB VPC Gateway Endpoint] in vpc
    
    service ecs(server)[ECS Fargate (Next.js)] in privAppA
    service sqs(database)[Amazon SQS Queue] in aws
    service event(server)[EventBridge Cron] in aws
    service master(server)[Master Lambda] in privAppA
    service worker(server)[Worker Lambda] in privAppB
    
    service ddb(database)[DynamoDB (Regional)] in aws
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

1. **Create the VPC**: Navigate to **VPC > Your VPCs > Create VPC**. Name: `epl-vpc`. CIDR: `10.0.0.0/16`.
2. **Create 4 Subnets** (Split across 2 Availability Zones):
   - **Public Subnet 1**: `10.0.0.0/24`
   - **Public Subnet 2**: `10.0.1.0/24`
   - **Private App Subnet 1**: `10.0.2.0/24`
   - **Private App Subnet 2**: `10.0.3.0/24`
3. **Gateways & Routing**
   - **Internet Gateway (IGW)**: Attach to `epl-vpc`.
   - **NAT Gateway**: Create in **Public Subnet 1**. Allocate an Elastic IP. 
   - **Public Route Table**: Route `0.0.0.0/0` -> `IGW`. Attach to Public Subnets.
   - **Private Route Table**: Route `0.0.0.0/0` -> `NAT Gateway`. Attach to Private App Subnets.
4. **DynamoDB VPC Gateway Endpoint**
   - Create a Gateway Endpoint for DynamoDB and attach it to your Private Route Tables. This keeps database traffic off the public internet.

---

## 💾 Phase 2: True Single-Table DynamoDB Design
*Goal: Port Firestore to DynamoDB using advanced enterprise NoSQL access patterns.*

Unlike Firestore, where you have different "collections" for Sources, Clubs, and Articles, in DynamoDB you will store everything in a **single table**.

1. Navigate to **DynamoDB > Tables > Create Table**.
2. **Table Configuration**:
   - **Name**: `EplReview_Data`
   - **Partition Key (PK)**: `PK` (String)
   - **Sort Key (SK)**: `SK` (String)

3. **Data Modeling Rules (How you will save data)**:
   - **Sources**: `PK="SOURCE#<id>"`, `SK="METADATA"`
   - **Clubs**: `PK="CLUB#<slug>"`, `SK="METADATA"`
   - **Articles**: `PK="ARTICLE#<id>"`, `SK="METADATA"`

4. **Many-to-Many Relationships (Articles to Clubs)**:
   An article can belong to multiple clubs. To model this, you will save "Link" items for every club an article is tagged to:
   - `PK="CLUB#<slug>"`, `SK="ARTICLE#<publishedAt>#<articleId>"`
   - *Why?* This allows you to instantly query all articles for "arsenal" sorted chronologically just by querying `PK="CLUB#arsenal" AND SK begins_with "ARTICLE#"`.

---

## ⚙️ Phase 3: Decoupled Scraping Engine (EventBridge + SQS + Lambda)
*Goal: Break down the monolithic script into a scalable worker queue.*

> [!NOTE]
> **Why are Lambdas in a VPC?** You don't strictly need Lambdas in a VPC just to reach DynamoDB or SQS. However, we are placing them in the Private Subnets intentionally for this lab so you are forced to learn how NAT Gateways, Route Tables, and VPC Endpoints work!

1. **Amazon SQS Queue**
   - Create a **Standard Queue** named `epl-ingestion-queue`. (Standard provides parallel throughput, whereas FIFO restricts concurrency).
   - Set up a **Dead Letter Queue (DLQ)**.
2. **"Master" Lambda Function**
   - Attached to your **Private App Subnets**.
   - Logic: Query DynamoDB for `PK begins_with "SOURCE#"`. Loop through them and push a JSON message to SQS.
3. **Amazon EventBridge (Cron)**
   - Rule Schedule: `cron(0 2 * * ? *)`
   - Target: Master Lambda.
4. **"Worker" Lambda Function**
   - Attached to your **Private App Subnets**.
   - Trigger: The SQS Queue.
   - Logic: Receives 1 feed URL, scrapes it via NAT Gateway, and writes the Article and Link items to DynamoDB.

---

## 🔒 Phase 4: Security & Least-Privilege IAM
*Goal: Secure API keys and restrict resource access.*

1. **Secrets Manager**: Store your `FIRECRAWL_API_KEY` here.
2. **IAM Roles**: 
   - Start your Lambdas with `AWSLambdaVPCAccessExecutionRole`, `AmazonDynamoDBFullAccess`, and `AmazonSQSFullAccess`.
   - **Learning Exercise**: Once the lab works, replace `FullAccess` with strict inline JSON policies that only allow `dynamodb:PutItem` and `dynamodb:Query` on your specific table ARN.

---

## 🖥️ Phase 5: Containerizing & Refactoring the Next.js Frontend
*Goal: Build the Next.js App Router for ECS deployment.*

> [!WARNING]
> **Frontend Refactoring Required**: Your current codebase relies heavily on Firebase Client SDKs in client components. DynamoDB does not have client-side security rules. To securely fetch data in AWS, you must move all database queries into Next.js **React Server Components (RSC)** or API Routes so the AWS SDK runs securely on the server.

1. **Dockerfile Configuration**: 
   Because your project is in `app/`, create this Dockerfile in the `app/` directory:
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

---

## 🌐 Phase 6: Hosting the Frontend (ALB + ECS Fargate)
*Goal: Serve the container to the web.*

1. **Amazon ECR**: Create a repository `epl-frontend`. Build and push your Docker image.
2. **Application Load Balancer (ALB)**: Create an Internet-facing ALB in your Public Subnets.
3. **ECS Cluster & Task**: 
   - Create a Fargate cluster.
   - Create a Task Definition pointing to your ECR image.
   - Run the service in your **Private App Subnets**, linked to the ALB Target Group.

---

## 🚨 Phase 7: Monitoring & Alarms (CloudWatch)
*Goal: Build enterprise-grade alerting.*

1. Navigate to **CloudWatch > Alarms > Create Alarm**.
2. **Setup the following 3 Alarms**:
   - **Lambda Errors**: Alarm if the Master Lambda `Errors` metric > 0.
   - **DLQ Depth**: Alarm if your SQS DLQ `ApproximateNumberOfMessagesVisible` > 0 (meaning scrapers are failing).
   - **ECS Health**: Alarm if your ALB `UnHealthyHostCount` > 0.
3. **Log Inspection**: Practice querying your Worker Lambda logs using **CloudWatch Logs Insights**.
