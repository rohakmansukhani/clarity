# AWS EC2 Deployment Guide - Clarity Backend

This document tracks the commands and steps used to deploy the Clarity FastAPI backend to an AWS EC2 instance (Free Tier).

## 1. Instance Information
- **OS**: Ubuntu 24.04 LTS (HVM)
- **Instance Type**: `t3.micro` or `t2.micro` (Free Tier Eligible)
- **Public IP**: `35.154.120.113`
- **Username**: `ubuntu`
- **SSH Key**: `/Users/rohakmansukhani/Documents/Coding/Projects/Clarity/Clarity_Aws.pem`
- **Security Group Inbound Rules**:
  - 22 (SSH) -> My IP
  - 80 (HTTP) -> 0.0.0.0/0
  - 443 (HTTPS) -> 0.0.0.0/0 (Optional)

## 2. Local Machine Setup (on Mac)

### Prepare SSH Key
```bash
chmod 400 /Users/rohakmansukhani/Documents/Coding/Projects/Clarity/Clarity_Aws.pem
```

### Clean Sync to VM
This command syncs the `backend` folder, skips junk, and deletes stray files on the server.
```bash
rsync -avzP --delete -e "ssh -i /Users/rohakmansukhani/Documents/Coding/Projects/Clarity/Clarity_Aws.pem" \
--exclude 'venv' \
--exclude '.git' \
--exclude '.DS_Store' \
--exclude '__pycache__' \
--exclude '*.pyc' \
/Users/rohakmansukhani/Documents/Coding/Projects/Clarity/backend \
ubuntu@35.154.120.113:/home/ubuntu/clarity-project/
```

## 3. Server Setup (on EC2)

### Connect to VM
```bash
ssh -i /Users/rohakmansukhani/Documents/Coding/Projects/Clarity/Clarity_Aws.pem ubuntu@35.154.120.113
```

### Install Docker and Docker Compose
```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker ubuntu
# Log out and log back in to apply group changes
exit
```

### Run Initial Setup Script (If available)
```bash
cd ~/clarity-project/backend/scripts
chmod +x deploy_vm_setup.sh
./deploy_vm_setup.sh
```

## 4. Launch Application (on EC2)

### Start Backend and Local Redis
Using Docker Compose ensures both the API and Redis are connected on the same network.
```bash
cd ~/clarity-project/backend
docker compose up --build -d
```

### Useful Maintenance Commands
```bash
# Check status
docker compose ps

# View logs
docker compose logs -f backend

# Stop everything
docker compose down

# Re-launch after code changes
docker compose up --build -d

# Restart and Clear Cache (Use this when updating code)
cd ~/clarity-project/backend
docker compose down
docker compose up --build -d
docker exec -it clarity-redis redis-cli flushdb
```

## 5. Frontend Configuration

To connect your local frontend to the live AWS backend:

1.  Open `/frontend/.env` on your local machine.
2.  Update the `NEXT_PUBLIC_API_URL` variable:
    ```bash
    NEXT_PUBLIC_API_URL=http://35.154.120.113/api/v1
    ```
3.  Restart your Next.js development server:
    ```bash
    npm run dev
    ```

## 6. Verification
- **Health Check**: `http://35.154.120.113/health`

## 7. Troubleshooting

### Redis Error: "ValueError: Redis URL must specify..."
- **Fix**: Use `REDIS_URL=redis://redis:6379/0` in your Docker Compose environment.

### Supabase Error: "521 Web server is down"
- **Fix**: Check if your Supabase project is "Paused" in the dashboard and Restore if necessary.

### Mixed Content Error / HTTPS Blocking HTTP
- **Fix**: Use a **Vercel Proxy (Rewrite)** as configured in `frontend/next.config.ts`.
- **Action Required**: Set Vercel Env Var `NEXT_PUBLIC_API_URL=/api/v1`.

## 8. AWS Specific Tips
- **Elastic IP**: Recommended to use an Elastic IP to ensure the IP doesn't change on reboot.
- **T3 Unlimited**: Be careful with "Unlimited" credits on T3 if you are on a strict budget, though t3.micro is usually fine for this load.




ssh-add ~/.ssh/github_personal
