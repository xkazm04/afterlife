#!/usr/bin/env sh
# Prints the commands that build, push and deploy the Belay hosted replay. It runs none of them:
# deploying is the operator's step. Review the output, then run it yourself from the repo root.
#
#   PROJECT_ID=my-project sh infra/cloudrun/deploy.sh            # print
#   PROJECT_ID=my-project sh infra/cloudrun/deploy.sh > deploy.cmds  # keep for review
#
# PROJECT_ID is required; REGION, REPOSITORY and TAG have defaults.
set -eu

: "${PROJECT_ID:?set PROJECT_ID to the Google Cloud project}"
REGION="${REGION:-europe-west1}"
REPOSITORY="${REPOSITORY:-belay}"
TAG="${TAG:-$(git rev-parse --short HEAD 2>/dev/null || echo latest)}"
SERVICE=belay-replay
IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${SERVICE}:${TAG}"

cat <<EOF
# 1. Build from the repo root (context filtered by infra/cloudrun/Dockerfile.dockerignore).
docker build --platform linux/amd64 -f infra/cloudrun/Dockerfile -t ${IMAGE} .

# 2. Check the image before it leaves this machine (contract items 1-3).
docker run --rm ${IMAGE} env | grep -E '^BELAY_|TOKEN'   # expect only BELAY_MODE=replay

# 3. Push to Artifact Registry (create the repository once).
gcloud artifacts repositories create ${REPOSITORY} --project=${PROJECT_ID} --location=${REGION} --repository-format=docker
gcloud auth configure-docker ${REGION}-docker.pkg.dev
docker push ${IMAGE}

# 4. Deploy the service definition (maxScale 2, concurrency 20, env BELAY_MODE=replay only).
sed 's#IMAGE_URL#${IMAGE}#' infra/cloudrun/service.yaml > service.rendered.yaml
gcloud run services replace service.rendered.yaml --project=${PROJECT_ID} --region=${REGION}

# 5. Public access: no login on the replay (see the security contract).
gcloud run services add-iam-policy-binding ${SERVICE} --project=${PROJECT_ID} --region=${REGION} --member=allUsers --role=roles/run.invoker

# 6. Check the live URL.
URL=\$(gcloud run services describe ${SERVICE} --project=${PROJECT_ID} --region=${REGION} --format='value(status.url)')
curl -sI "\$URL/"
EOF
