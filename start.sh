#!/bin/bash

echo ""
echo "Starting Repo-Ninja..."
echo ""

docker-compose up -d

echo ""
echo -e "\033[32m====================================\033[0m"
echo -e "\033[32m  Repo-Ninja is ready!\033[0m"
echo -e "\033[33m  Open: http://localhost:3000\033[0m"
echo -e "\033[32m====================================\033[0m"
echo ""
