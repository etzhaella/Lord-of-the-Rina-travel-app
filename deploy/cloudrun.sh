#!/usr/bin/env bash
# Deploy Lord of the Rina to Google Cloud Run (backend + frontend) with Cloud SQL Postgres.
#
# Prerequisites (one time):
#   gcloud auth login && gcloud config set project YOUR_PROJECT
#   gcloud services enable run.googleapis.com sqladmin.googleapis.com cloudbuild.googleapis.com \
#       artifactregistry.googleapis.com secretmanager.googleapis.com places.googleapis.com
#   gcloud sql instances create rina-db --database-version=POSTGRES_16 --tier=db-f1-micro --region=$REGION
#   gcloud sql databases create rina --instance=rina-db
#   gcloud sql users create rina --instance=rina-db --password='CHANGE_ME'
#   printf '%s' 'YOUR_GOOGLE_PLACES_KEY' | gcloud secrets create places-key --data-file=-
#   printf '%s' 'CHANGE_ME' | gcloud secrets create db-password --data-file=-
set -euo pipefail

PROJECT=$(gcloud config get-value project)
REGION=${REGION:-europe-west1}
INSTANCE="$PROJECT:$REGION:rina-db"
cd "$(dirname "$0")/.."

echo "▶ backend"
gcloud run deploy rina-backend \
  --source ./backend \
  --region "$REGION" \
  --allow-unauthenticated \
  --add-cloudsql-instances "$INSTANCE" \
  --set-secrets "GOOGLE_PLACES_API_KEY=places-key:latest,DB_PASSWORD=db-password:latest" \
  --set-env-vars "DEFAULT_CURRENCY=EUR,PLACES_LANGUAGE=en" \
  --command sh \
  --args "-c,export DATABASE_URL=\"postgresql+psycopg://rina:\${DB_PASSWORD}@/rina?host=/cloudsql/$INSTANCE\" && uvicorn app.main:app --host 0.0.0.0 --port \$PORT --proxy-headers"

BACKEND_URL=$(gcloud run services describe rina-backend --region "$REGION" --format 'value(status.url)')
echo "  backend: $BACKEND_URL"

echo "▶ frontend"
gcloud run deploy rina-frontend \
  --source ./frontend \
  --region "$REGION" \
  --allow-unauthenticated \
  --set-env-vars "BACKEND_URL=$BACKEND_URL"

echo "✔ done:"
gcloud run services describe rina-frontend --region "$REGION" --format 'value(status.url)'
