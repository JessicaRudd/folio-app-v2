# Folio Deployment Guide

This application is configured as a "Cloud Run Appliance" using the multi-container sidecar pattern.

## Deployment Command

To deploy the entire stack (Next.js app + imgproxy sidecar) to Google Cloud Run, use the following command:

```bash
gcloud run deploy folio-app-v1 \
  --compose=docker-compose.yaml \
  --region=us-central1 \
  --allow-unauthenticated
```

## Architecture Details

- **Web Container**: Serves the Next.js/Vite application on port 3000.
- **Image-Proc Sidecar**: Runs `imgproxy` on port 8080. The web app communicates with it via `http://localhost:8080`.
- **Scaling**: Configured with `min-instances: 0` to scale to zero when idle, minimizing costs.
- **Secrets**: Environment variables like `GEMINI_API_KEY` and `FIREBASE_CONFIG` should be managed via Google Secret Manager and mapped in the `docker-compose.yaml`.

## CI/CD Integration

The `cloudbuild.yaml` (to be implemented in Phase 5) will automate this deployment whenever changes are pushed to the `main` branch.
