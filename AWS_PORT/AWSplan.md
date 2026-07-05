# The EPL Review: AWS Architecture Port & Tutorial

This document serves as your learning blueprint for porting *The EPL Review* from Firebase to a fully decoupled, highly scalable, enterprise-grade AWS architecture. By following this guide, you will manually provision and connect some of the most critical services in AWS.

---

## 🏛️ Architecture Overview

```mermaid
architecture-beta
    group aws(cloud)[AWS Cloud]

    group vpc(cloud)[VPC 10.0.0.0/16] in aws
    
    group pubA(cloud)[Public Subnet A] in vpc
    group pubB(cloud)[Public Subnet B] in vpc
    
    group privAppA(cloud)[Private App Subnet A] in vpc
    group privAppB(cloud)[Private App Subnet B] in vpc
    
    group privDataA(cloud)[Private Data Subnet A] in vpc
    group privDataB(cloud)[Private Data Subnet B] in vpc

    service igw(internet)[Internet Gateway] in vpc
    service alb(server)[Application Load Balancer] in pubA
    service nat(server)[NAT Gateway] in pubA
    
    service ecs(server)[ECS Fargate (Next.js)] in privAppA
    service sqs(database)[Amazon SQS Queue] in aws
    service event(server)[EventBridge Cron] in aws
    service master(server)[Master Lambda] in privAppA
    service worker(server)[Worker Lambda] in privAppB
    
    service ddb(database)[DynamoDB] in privDataA
    service secrets(database)[Secrets Manager] in aws

    igw:R -- L:alb
    igw:R -- L:nat
    alb:R -- L:ecs
    ecs:R -- L:ddb
    
    event:R -- L:master
    master:R -- L:sqs
    sqs:R -- L:worker
    worker:R -- L:ddb
    worker:R -- L:nat
```

---

## 🛠️ Phase 1: The Network Foundation (VPC)
*Goal: Create an isolated network environment with proper internet routing.*

1. **Create the VPC**
   - Navigate to **VPC > Your VPCs > Create VPC**.
   - Name: `epl-vpc`
   - CIDR: `10.0.0.0/16`
2. **Create 6 Subnets** (Split across 2 Availability Zones, e.g., `us-east-1a` and `us-east-1b`):
   - **Public Subnet 1**: `10.0.0.0/24` (AZ: 1a)
   - **Public Subnet 2**: `10.0.1.0/24` (AZ: 1b)
   - **Private App Subnet 1**: `10.0.2.0/24` (AZ: 1a)
   - **Private App Subnet 2**: `10.0.3.0/24` (AZ: 1b)
   - **Private Data Subnet 1**: `10.0.4.0/24` (AZ: 1a)
   - **Private Data Subnet 2**: `10.0.5.0/24` (AZ: 1b)
3. **Internet Gateway (IGW)**
   - Create an IGW named `epl-igw` and attach it to `epl-vpc`.
4. **NAT Gateway**
   - Create a NAT Gateway named `epl-nat` in **Public Subnet 1**.
   - Allocate an Elastic IP for it.
   - *(Note: This costs ~$32/month. This allows your Private App resources to reach out to the internet to scrape RSS feeds).*
5. **Route Tables**
   - **Public Route Table**: Create and associate with the 2 Public Subnets. Add a route: `0.0.0.0/0` -> `epl-igw`.
   - **Private Route Table**: Create and associate with the 2 Private App Subnets. Add a route: `0.0.0.0/0` -> `epl-nat`.

---

## 💾 Phase 2: The Database (DynamoDB)
*Goal: Replace Firestore with Amazon's serverless NoSQL database.*

1. Navigate to **DynamoDB > Tables > Create Table**.
2. Create the following tables:
   - **Table Name**: `Articles` | **Partition Key**: `id` (String) | **Sort Key**: `publishedAt` (String - ISO8601)
   - **Table Name**: `Clubs` | **Partition Key**: `id` (String)
   - **Table Name**: `Sources` | **Partition Key**: `id` (String)
3. **Global Secondary Indexes (GSI)**:
   - On the `Articles` table, create a GSI with Partition Key `clubId` to allow fetching articles for a specific club quickly.

---

## 🔒 Phase 3: Security & Secrets
*Goal: Store API keys securely and define strict resource permissions.*

1. **Secrets Manager**
   - Store your Firecrawl API key.
   - Name: `epl/prod/firecrawl`
   - Key/Value: `FIRECRAWL_API_KEY` = `your_actual_key`
2. **IAM Execution Roles**
   - Create an IAM Role for your **ECS Task**. Give it policies: `AmazonDynamoDBFullAccess` and `SecretsManagerReadWrite`.
   - Create an IAM Role for your **Lambda Functions**. Give it policies: `AWSLambdaVPCAccessExecutionRole`, `AmazonDynamoDBFullAccess`, `AmazonSQSFullAccess`.

---

## 🖥️ Phase 4: Frontend Containerization
*Goal: Dockerize the Next.js app to run on AWS ECS.*

1. **Create a `Dockerfile`** in the root of your project:
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
2. **Amazon ECR (Elastic Container Registry)**
   - Navigate to **ECR > Create Repository**. Name it `epl-frontend`.
   - Use the AWS CLI to authenticate Docker, build your image (`docker build -t epl-frontend .`), and push it to the ECR URI provided in the console.

---

## 🌐 Phase 5: Hosting the Frontend (ECS & ALB)
*Goal: Serve the Next.js Docker image to the internet via a Load Balancer.*

1. **Application Load Balancer (ALB)**
   - Navigate to **EC2 > Load Balancers > Create ALB**.
   - Name: `epl-alb`. Make it **Internet-facing**.
   - Map it to your **2 Public Subnets**.
   - Create a **Target Group** (Target type: IP, Port 3000) and link it to the ALB.
2. **ECS Cluster & Task Definition**
   - Navigate to **ECS > Clusters > Create Cluster**. Name it `epl-cluster` (AWS Fargate).
   - Create a **Task Definition**. Select the ECR image URI you uploaded. Allocate 1 vCPU and 2GB RAM.
   - Attach the **ECS Execution Role** you created in Phase 3.
3. **Run the ECS Service**
   - Inside `epl-cluster`, create a **Service**.
   - Launch Type: **Fargate**.
   - Network Configuration: Select your **2 Private App Subnets**.
   - Security Group: Allow inbound Port 3000 from the ALB's security group.
   - Load Balancing: Attach the Target Group you created.
   - *(Once running, copy the ALB's DNS name and paste it into your browser to see The EPL Review live!)*

---

## ⚙️ Phase 6: Decoupled Scraping Engine (EventBridge + SQS + Lambda)
*Goal: Break down your massive 9-minute `ingestRun` script into an enterprise, event-driven microservice architecture.*

Instead of one massive function running until it times out, we will use AWS SQS to process each RSS feed completely independently.

1. **Amazon SQS Queue**
   - Navigate to **SQS > Create Queue**. Name it `epl-ingestion-queue.fifo`.
2. **"Master" Lambda Function**
   - Create a Node.js Lambda function attached to your **Private App Subnets**.
   - **Code Logic**: Fetch all active Sources from DynamoDB. For each Source, push a JSON message containing the `sourceId` and `feedUrl` to the `epl-ingestion-queue`.
3. **Amazon EventBridge (The Cron Job)**
   - Navigate to **EventBridge > Rules > Create Rule**.
   - Schedule: `cron(0 2 * * ? *)` (Runs daily at 2 AM).
   - Target: Your **Master Lambda Function**.
4. **"Worker" Lambda Function**
   - Create another Node.js Lambda function attached to your **Private App Subnets**.
   - **Trigger**: Add the `epl-ingestion-queue` as the trigger.
   - **Code Logic**: This function receives a single `sourceId` from SQS. It downloads the XML/HTML, parses it using regex, and writes the articles to DynamoDB. 
   - **Benefit**: If one source fails or times out, it goes to a Dead Letter Queue (DLQ), and the other 50 sources continue processing perfectly in parallel!
