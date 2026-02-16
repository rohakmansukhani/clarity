#!/bin/bash

# VM Setup Script for Clarity Backend
# Run this script on your Azure VM

# 1. Update system
echo "Updating system..."
sudo apt-get update && sudo apt-get upgrade -y

# 2. Install Docker
echo "Installing Docker..."
sudo apt-get install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io

# 3. Enable Docker and add user to group
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER

# 4. Install Docker Compose
# Check if docker-compose-plugin is installed (it was in the previous step)
if ! docker compose version > /dev/null 2>&1; then
    echo "Installing Docker Compose plugin..."
    sudo apt-get update
    sudo apt-get install -y docker-compose-plugin
fi

echo "Setup complete! Please log out and log back in for docker group changes to take effect."
echo "After re-logging, run: cd ~/clarity-project/backend && docker compose up --build -d"
