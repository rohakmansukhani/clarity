#!/bin/bash

# Configuration - Change these to your preferences
RESOURCE_GROUP="rg-clarity-prod"
LOCATION="eastus"
ACR_NAME="crclarityprod" # Must be globally unique
CONTAINER_APP_NAME="ca-clarity-backend"
ENVIRONMENT_NAME="env-clarity-prod"

# 1. Login to Azure (Interactive)
echo "Logging into Azure..."
az login

# 2. Create Resource Group
echo "Creating Resource Group: $RESOURCE_GROUP in $LOCATION..."
az group create --name $RESOURCE_GROUP --location $LOCATION

# 3. Create Azure Container Registry (Basic Tier - ~$5/mo)
echo "Creating Azure Container Registry: $ACR_NAME..."
az acr create --resource-group $RESOURCE_GROUP --name $ACR_NAME --sku Basic

# 4. Login to ACR
echo "Logging into ACR..."
az acr login --name $ACR_NAME

# 5. Build and Push Image
echo "Building and pushing Docker image..."
ACR_LOGIN_SERVER=$(az acr show --name $ACR_NAME --query loginServer --output tsv)
docker build -t $ACR_LOGIN_SERVER/clarity-backend:latest .
docker push $ACR_LOGIN_SERVER/clarity-backend:latest

# 6. Create Container App Environment (Consumption tier defaults)
echo "Creating Container App Environment..."
az containerapp env create --name $ENVIRONMENT_NAME --resource-group $RESOURCE_GROUP --location $LOCATION

# 7. Create Container App (Scaled to Zero when idle for $0 cost)
echo "Deploying Container App..."
az containerapp create \
  --name $CONTAINER_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --environment $ENVIRONMENT_NAME \
  --image $ACR_LOGIN_SERVER/clarity-backend:latest \
  --target-port 8000 \
  --ingress external \
  --min-replicas 0 \
  --max-replicas 1 \
  --query properties.configuration.ingress.fqdn

echo "Deployment initiated. Remember to configure secrets and environment variables in the Azure Portal for $CONTAINER_APP_NAME."
echo "Required variables from .env.example: SUPABASE_URL, SUPABASE_KEY, REDIS_URL, GROQ_API_KEY, etc."
