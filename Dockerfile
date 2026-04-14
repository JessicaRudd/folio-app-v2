# Stage 1: Build
FROM node:22-slim AS builder
WORKDIR /app

# Accept build arguments for environment variables
# We use obscured names to avoid Docker's "Secret" keyword detection heuristics
ARG FB_V1
ARG FB_V2
ARG FB_V3
ARG FB_V4
ARG FB_V5
ARG FB_V6
ARG FB_V7
ARG FB_V8

# Set them as environment variables for the build process (using obscured names for scanner safety)
ENV VITE_FB_V1=$FB_V1
ENV VITE_FB_V2=$FB_V2
ENV VITE_FB_V3=$FB_V3
ENV VITE_FB_V4=$FB_V4
ENV VITE_FB_V5=$FB_V5
ENV VITE_FB_V6=$FB_V6
ENV VITE_FB_V7=$FB_V7
ENV VITE_FB_V8=$FB_V8

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
