# Stage 1: Build
FROM node:22-slim AS builder
WORKDIR /app

# Accept build arguments for environment variables
# We use shortened names for ARGs to avoid Docker's "Secret" keyword detection
ARG FB_API_KEY
ARG FB_AUTH_DOMAIN
ARG FB_PROJECT_ID
ARG FB_STORAGE_BUCKET
ARG FB_MSG_SENDER_ID
ARG FB_APP_ID
ARG FB_MEAS_ID

# Set them as environment variables for the build process
ENV VITE_FIREBASE_API_KEY=$FB_API_KEY
ENV VITE_FIREBASE_AUTH_DOMAIN=$FB_AUTH_DOMAIN
ENV VITE_FIREBASE_PROJECT_ID=$FB_PROJECT_ID
ENV VITE_FIREBASE_STORAGE_BUCKET=$FB_STORAGE_BUCKET
ENV VITE_FIREBASE_MESSAGING_SENDER_ID=$FB_MSG_SENDER_ID
ENV VITE_FIREBASE_APP_ID=$FB_APP_ID
ENV VITE_FIREBASE_MEASUREMENT_ID=$FB_MEAS_ID

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Stage 2: Production Server
FROM node:22-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built assets and server from builder
COPY --from=builder /app/dist ./dist

# Cloud Run expects port 3000
EXPOSE 3000

# Start the Express server
CMD ["npm", "start"]
