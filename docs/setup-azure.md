# Deploying Repo-Ninja to Azure

This guide walks through deploying Repo-Ninja and its ChromaDB sidecar to Microsoft Azure. Two deployment options are covered: Azure Container Apps (recommended) and Azure App Service.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Option A: Azure Container Apps (Recommended)](#option-a-azure-container-apps-recommended)
3. [Option B: Azure App Service](#option-b-azure-app-service)
4. [Environment Variables for Azure](#environment-variables-for-azure)
5. [Updating Your GitHub OAuth App](#updating-your-github-oauth-app)
6. [CI/CD with GitHub Actions](#cicd-with-github-actions)
7. [Cost Considerations](#cost-considerations)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, make sure you have the following:

- **Azure subscription** -- [Create a free account](https://azure.microsoft.com/free/) if you do not have one.
- **Azure CLI (`az`) installed and authenticated** -- [Install instructions](https://learn.microsoft.com/cli/azure/install-azure-cli). After installing, run:

  ```bash
  az login
  ```

- **Docker Desktop** installed and running -- needed to build and push container images. [Download here](https://www.docker.com/products/docker-desktop/).
- **GitHub OAuth App registered** -- Repo-Ninja uses GitHub OAuth (via NextAuth.js) for authentication. If you have not registered an OAuth App yet, follow the instructions in the [main README](../README.md#step-1-register-a-github-oauth-app). You will update the callback URL to your Azure URL after deployment.
- **The app working locally first** -- Before deploying to Azure, verify that Repo-Ninja runs correctly on your machine with `docker-compose up -d`. Confirm you can sign in with GitHub and that ChromaDB is healthy. Debugging configuration issues is far easier locally than in the cloud.

---

## Option A: Azure Container Apps (Recommended)

Azure Container Apps provides a serverless container hosting platform with built-in support for internal service-to-service networking. This is the recommended approach because both the Repo-Ninja app and ChromaDB can run in the same environment with automatic internal DNS resolution.

### Step 1: Set shell variables

Define these variables once so all subsequent commands can reference them. Replace the placeholder values with your own.

```bash
RESOURCE_GROUP="<your-resource-group>"
LOCATION="eastus"
ENVIRONMENT_NAME="repo-ninja-env"
ACR_NAME="<your-acr-name>"
APP_NAME="repo-ninja"
CHROMADB_APP_NAME="repo-ninja-chromadb"
```

### Step 2: Create a resource group

```bash
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION
```

### Step 3: Create an Azure Container Registry (ACR)

ACR stores the Repo-Ninja Docker image so that Azure Container Apps can pull it.

```bash
az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $ACR_NAME \
  --sku Basic \
  --admin-enabled true
```

### Step 4: Build and push the Repo-Ninja image to ACR

From the root of the Repo-Ninja repository (where the `Dockerfile` is located):

```bash
az acr login --name $ACR_NAME

docker build -t $ACR_NAME.azurecr.io/repo-ninja:latest .

docker push $ACR_NAME.azurecr.io/repo-ninja:latest
```

Alternatively, you can build directly in ACR without a local Docker engine:

```bash
az acr build \
  --registry $ACR_NAME \
  --image repo-ninja:latest \
  .
```

### Step 5: Create a Container Apps environment

The environment provides a shared network boundary. Containers in the same environment can communicate via internal DNS.

```bash
az containerapp env create \
  --name $ENVIRONMENT_NAME \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION
```

### Step 6: Deploy ChromaDB as an internal container app

ChromaDB should only be accessible from within the environment (not from the public internet). Use `--ingress internal` so that only sibling container apps can reach it.

```bash
az containerapp create \
  --name $CHROMADB_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --environment $ENVIRONMENT_NAME \
  --image chromadb/chroma:latest \
  --target-port 8000 \
  --ingress internal \
  --min-replicas 1 \
  --max-replicas 1 \
  --cpu 0.5 \
  --memory 1.0Gi
```

After creation, get the internal FQDN. Other container apps in the same environment can reach ChromaDB at this URL:

```bash
CHROMADB_FQDN=$(az containerapp show \
  --name $CHROMADB_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "properties.configuration.ingress.fqdn" \
  --output tsv)

echo "ChromaDB internal URL: http://$CHROMADB_FQDN"
```

### Step 7: Deploy the Repo-Ninja app

Retrieve your ACR credentials:

```bash
ACR_PASSWORD=$(az acr credential show \
  --name $ACR_NAME \
  --query "passwords[0].value" \
  --output tsv)
```

Deploy the app with external ingress on port 3000. Replace the placeholder environment variable values with your actual credentials:

```bash
az containerapp create \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --environment $ENVIRONMENT_NAME \
  --image $ACR_NAME.azurecr.io/repo-ninja:latest \
  --registry-server $ACR_NAME.azurecr.io \
  --registry-username $ACR_NAME \
  --registry-password $ACR_PASSWORD \
  --target-port 3000 \
  --ingress external \
  --min-replicas 1 \
  --max-replicas 3 \
  --cpu 0.5 \
  --memory 1.0Gi \
  --env-vars \
    GITHUB_CLIENT_ID="<your-github-client-id>" \
    GITHUB_CLIENT_SECRET="<your-github-client-secret>" \
    NEXTAUTH_SECRET="<your-nextauth-secret>" \
    NEXTAUTH_URL="https://<your-app-name>.<region>.azurecontainerapps.io" \
    CHROMADB_URL="http://$CHROMADB_FQDN"
```

### Step 8: Get the public URL

```bash
APP_URL=$(az containerapp show \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "properties.configuration.ingress.fqdn" \
  --output tsv)

echo "Repo-Ninja is live at: https://$APP_URL"
```

### Step 9: Update NEXTAUTH_URL to the actual URL

Now that you know the real public URL, update the environment variable:

```bash
az containerapp update \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --set-env-vars \
    NEXTAUTH_URL="https://$APP_URL"
```

Then proceed to [Updating Your GitHub OAuth App](#updating-your-github-oauth-app) to update your callback URL.

---

## Option B: Azure App Service

Azure App Service is a traditional PaaS option for hosting web applications. It works well for the Repo-Ninja app itself but does not natively host sidecar containers, so ChromaDB must be deployed separately.

### Step 1: Set shell variables

```bash
RESOURCE_GROUP="<your-resource-group>"
LOCATION="eastus"
ACR_NAME="<your-acr-name>"
APP_SERVICE_PLAN="repo-ninja-plan"
WEB_APP_NAME="<your-web-app-name>"
```

### Step 2: Create a resource group and ACR

If you have not already done so:

```bash
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION

az acr create \
  --resource-group $RESOURCE_GROUP \
  --name $ACR_NAME \
  --sku Basic \
  --admin-enabled true
```

### Step 3: Build and push the image

From the repository root:

```bash
az acr login --name $ACR_NAME

docker build -t $ACR_NAME.azurecr.io/repo-ninja:latest .

docker push $ACR_NAME.azurecr.io/repo-ninja:latest
```

### Step 4: Create an App Service Plan

A Linux B1 plan is the minimum recommended tier. For production workloads, consider B2 or higher.

```bash
az appservice plan create \
  --name $APP_SERVICE_PLAN \
  --resource-group $RESOURCE_GROUP \
  --sku B1 \
  --is-linux
```

### Step 5: Create the Web App

```bash
ACR_PASSWORD=$(az acr credential show \
  --name $ACR_NAME \
  --query "passwords[0].value" \
  --output tsv)

az webapp create \
  --name $WEB_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --plan $APP_SERVICE_PLAN \
  --container-image-name $ACR_NAME.azurecr.io/repo-ninja:latest \
  --container-registry-url https://$ACR_NAME.azurecr.io \
  --container-registry-user $ACR_NAME \
  --container-registry-password $ACR_PASSWORD
```

### Step 6: Configure the exposed port

The Repo-Ninja Dockerfile exposes port 3000:

```bash
az webapp config appsettings set \
  --name $WEB_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings WEBSITES_PORT=3000
```

### Step 7: Set environment variables

```bash
az webapp config appsettings set \
  --name $WEB_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --settings \
    GITHUB_CLIENT_ID="<your-github-client-id>" \
    GITHUB_CLIENT_SECRET="<your-github-client-secret>" \
    NEXTAUTH_SECRET="<your-nextauth-secret>" \
    NEXTAUTH_URL="https://$WEB_APP_NAME.azurewebsites.net" \
    CHROMADB_URL="<your-chromadb-url>"
```

### Step 8: Deploy ChromaDB separately

App Service does not support multi-container sidecar deployments in the same way as Container Apps. You have two options:

**Option 1: Deploy ChromaDB to Azure Container Apps**

Follow Steps 5 and 6 from [Option A](#step-5-create-a-container-apps-environment) to create a Container Apps environment and deploy ChromaDB. Use **external** ingress if the App Service and Container Apps environment are not in the same virtual network, or configure VNet integration for private networking.

**Option 2: Use Azure AI Search instead of ChromaDB**

Repo-Ninja's knowledge store is built behind a `KnowledgeStore` interface abstraction (see `src/lib/types.ts`). This means the ChromaDB implementation can be swapped for an Azure AI Search implementation without changing the rest of the application. If you prefer a fully managed search service, consider implementing the `KnowledgeStore` interface against Azure AI Search.

### Step 9: Update your GitHub OAuth App

Your app will be available at `https://<your-web-app-name>.azurewebsites.net`. Proceed to [Updating Your GitHub OAuth App](#updating-your-github-oauth-app).

---

## Environment Variables for Azure

The environment variables are the same as local development, with two key differences:

| Variable | Local Value | Azure Value |
|----------|------------|-------------|
| `GITHUB_CLIENT_ID` | Your OAuth App Client ID | Same value |
| `GITHUB_CLIENT_SECRET` | Your OAuth App Client Secret | Same value |
| `NEXTAUTH_SECRET` | Generated random string | Same value (or generate a new one for production) |
| `NEXTAUTH_URL` | `http://localhost:3000` | Your Azure public URL, e.g. `https://repo-ninja.<region>.azurecontainerapps.io` |
| `CHROMADB_URL` | `http://localhost:8000` | Internal container URL, e.g. `http://repo-ninja-chromadb.internal.<env-id>.azurecontainerapps.io` |

### Storing secrets in Azure Key Vault (recommended)

For production deployments, store sensitive values (`GITHUB_CLIENT_SECRET`, `NEXTAUTH_SECRET`) in Azure Key Vault rather than directly in environment variables.

```bash
# Create a Key Vault
az keyvault create \
  --name "<your-keyvault-name>" \
  --resource-group $RESOURCE_GROUP \
  --location $LOCATION

# Add secrets
az keyvault secret set \
  --vault-name "<your-keyvault-name>" \
  --name "github-client-secret" \
  --value "<your-github-client-secret>"

az keyvault secret set \
  --vault-name "<your-keyvault-name>" \
  --name "nextauth-secret" \
  --value "<your-nextauth-secret>"
```

For Container Apps, enable managed identity and reference Key Vault secrets:

```bash
# Enable system-assigned managed identity
az containerapp identity assign \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --system-assigned

# Grant the identity access to Key Vault secrets
IDENTITY_PRINCIPAL_ID=$(az containerapp identity show \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query "principalId" \
  --output tsv)

az keyvault set-policy \
  --name "<your-keyvault-name>" \
  --object-id $IDENTITY_PRINCIPAL_ID \
  --secret-permissions get list
```

For App Service, you can reference Key Vault secrets directly in app settings using the `@Microsoft.KeyVault(SecretUri=...)` syntax. See the [Azure documentation](https://learn.microsoft.com/azure/app-service/app-service-key-vault-references) for details.

---

## Updating Your GitHub OAuth App

After deploying, you must update your GitHub OAuth App so that the OAuth callback points to your Azure URL instead of `localhost`.

1. Go to [github.com/settings/developers](https://github.com/settings/developers)
2. Click on your **Repo-Ninja** OAuth App
3. Update the following fields:

   | Field | New Value |
   |-------|-----------|
   | **Homepage URL** | `https://<your-azure-app-url>` |
   | **Authorization callback URL** | `https://<your-azure-app-url>/api/auth/callback/github` |

4. Click **"Update application"**

For example, if your Container Apps URL is `https://repo-ninja.redfield-abc123.eastus.azurecontainerapps.io`, set:

- Homepage URL: `https://repo-ninja.redfield-abc123.eastus.azurecontainerapps.io`
- Callback URL: `https://repo-ninja.redfield-abc123.eastus.azurecontainerapps.io/api/auth/callback/github`

If your App Service URL is `https://repo-ninja.azurewebsites.net`, set:

- Homepage URL: `https://repo-ninja.azurewebsites.net`
- Callback URL: `https://repo-ninja.azurewebsites.net/api/auth/callback/github`

---

## CI/CD with GitHub Actions

The project already has a CI workflow at `.github/workflows/ci.yml` that runs lint and build checks on every push and pull request to `main`. You can extend this with a deployment workflow that automatically builds the Docker image, pushes it to ACR, and deploys to Azure Container Apps.

### Suggested deploy workflow

Create a file at `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Azure Container Apps

on:
  push:
    branches: [main]

jobs:
  deploy:
    name: Build & Deploy
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Log in to Azure
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Log in to ACR
        run: az acr login --name ${{ vars.ACR_NAME }}

      - name: Build and push image
        run: |
          docker build -t ${{ vars.ACR_NAME }}.azurecr.io/repo-ninja:${{ github.sha }} .
          docker push ${{ vars.ACR_NAME }}.azurecr.io/repo-ninja:${{ github.sha }}

      - name: Deploy to Container Apps
        run: |
          az containerapp update \
            --name repo-ninja \
            --resource-group ${{ vars.AZURE_RESOURCE_GROUP }} \
            --image ${{ vars.ACR_NAME }}.azurecr.io/repo-ninja:${{ github.sha }}
```

To use this workflow, add the following to your GitHub repository settings under **Settings > Secrets and variables > Actions**:

- **Secret:** `AZURE_CREDENTIALS` -- a JSON service principal credential. Generate one with:

  ```bash
  az ad sp create-for-rbac \
    --name "repo-ninja-github-actions" \
    --role contributor \
    --scopes /subscriptions/<your-subscription-id>/resourceGroups/<your-resource-group> \
    --json-auth
  ```

- **Variables:** `ACR_NAME` and `AZURE_RESOURCE_GROUP` with the appropriate values.

---

## Cost Considerations

| Resource | Tier | Estimated Cost |
|----------|------|---------------|
| **Azure Container Apps** | Consumption plan (pay per use) | Very low for dev/test. You pay only for active CPU and memory seconds. A dedicated plan is available for predictable workloads. |
| **Azure App Service** | B1 (Basic) minimum | Approximately $13/month. B2 or S1 recommended for production. |
| **Azure Container Registry** | Basic | Approximately $5/month. Sufficient for storing a small number of images. |
| **ChromaDB container** | Minimal resources (0.5 vCPU, 1 GB RAM) | Lightweight sidecar. On the Container Apps consumption plan, cost is negligible when idle. |
| **Azure Key Vault** | Standard | Negligible. Charged per operation (fractions of a cent per 10,000 operations). |

For development and testing, the Container Apps consumption plan combined with a Basic ACR tier is the most cost-effective option. The ChromaDB container is lightweight and does not require significant resources for typical knowledge base sizes.

---

## Troubleshooting

### App starts but OAuth fails ("callback URL mismatch" or redirect error)

The most common deployment issue. The **Authorization callback URL** configured in your GitHub OAuth App must exactly match the URL your deployed app is running on.

1. Get your actual app URL:

   ```bash
   az containerapp show \
     --name $APP_NAME \
     --resource-group $RESOURCE_GROUP \
     --query "properties.configuration.ingress.fqdn" \
     --output tsv
   ```

2. Go to [github.com/settings/developers](https://github.com/settings/developers) and verify the callback URL is `https://<that-exact-fqdn>/api/auth/callback/github`.

3. Verify the `NEXTAUTH_URL` environment variable matches the same URL:

   ```bash
   az containerapp show \
     --name $APP_NAME \
     --resource-group $RESOURCE_GROUP \
     --query "properties.template.containers[0].env" \
     --output table
   ```

### ChromaDB connection refused

If the Repo-Ninja app cannot reach ChromaDB:

1. Verify ChromaDB is running:

   ```bash
   az containerapp show \
     --name $CHROMADB_APP_NAME \
     --resource-group $RESOURCE_GROUP \
     --query "properties.runningStatus" \
     --output tsv
   ```

2. Verify ChromaDB has internal ingress enabled:

   ```bash
   az containerapp ingress show \
     --name $CHROMADB_APP_NAME \
     --resource-group $RESOURCE_GROUP
   ```

3. Confirm both container apps are in the **same environment**. Internal DNS resolution only works within a shared Container Apps environment.

4. Check that `CHROMADB_URL` on the Repo-Ninja app points to the correct internal FQDN (it should look like `http://repo-ninja-chromadb.internal.<env-unique-id>.<region>.azurecontainerapps.io`).

### Container will not start or crashes on startup

Check the container logs:

```bash
# Container Apps
az containerapp logs show \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --type console \
  --follow

# App Service
az webapp log tail \
  --name $WEB_APP_NAME \
  --resource-group $RESOURCE_GROUP
```

Common causes:

- **Missing environment variables** -- the app requires `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL` to start correctly.
- **Image pull failures** -- verify ACR credentials are correct and the image tag exists:

  ```bash
  az acr repository show-tags \
    --name $ACR_NAME \
    --repository repo-ninja \
    --output table
  ```

### App Service returns "Application Error" or a generic error page

Enable detailed logging:

```bash
az webapp log config \
  --name $WEB_APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --docker-container-logging filesystem

az webapp log tail \
  --name $WEB_APP_NAME \
  --resource-group $RESOURCE_GROUP
```

Also verify the `WEBSITES_PORT` setting is `3000`, matching the port exposed by the Dockerfile.

### Redeploying after code changes

After pushing a new image to ACR, trigger a redeployment:

```bash
# Container Apps
az containerapp update \
  --name $APP_NAME \
  --resource-group $RESOURCE_GROUP \
  --image $ACR_NAME.azurecr.io/repo-ninja:latest

# App Service
az webapp restart \
  --name $WEB_APP_NAME \
  --resource-group $RESOURCE_GROUP
```
