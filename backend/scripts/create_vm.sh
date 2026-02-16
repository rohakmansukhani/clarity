#!/bin/bash

# Configuration
RESOURCE_GROUP="rg-clarity-vm"
LOCATION="eastus"
VM_NAME="vm-clarity-backend"
VM_IMAGE="Ubuntu2204"
VM_SIZE="Standard_B1ms" # Good balance of cost and performance for students

# 1. Login
az login

# 2. Create Resource Group
echo "Creating Resource Group..."
az group create --name $RESOURCE_GROUP --location $LOCATION

# 3. Create VM
echo "Creating VM ($VM_SIZE)..."
az vm create \
  --resource-group $RESOURCE_GROUP \
  --name $VM_NAME \
  --image $VM_IMAGE \
  --size $VM_SIZE \
  --admin-username azureuser \
  --generate-ssh-keys \
  --public-ip-sku Standard

# 4. Open Port 8000
echo "Opening Port 8000..."
az vm open-port --port 8000 --resource-group $RESOURCE_GROUP --name $VM_NAME

echo "VM Created! You can now SSH into it using:"
echo "ssh azureuser@$(az vm show -d -g $RESOURCE_GROUP -n $VM_NAME --query publicIps -o tsv)"
