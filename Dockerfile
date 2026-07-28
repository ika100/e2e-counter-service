# ---- Builder stage ----
FROM node:22-alpine AS builder

WORKDIR /app

# Upgrade npm to latest to eliminate npm-bundled CVEs (tar, brace-expansion, etc.)
RUN npm install -g npm@latest
# Copy package files and install production deps only
COPY package*.json ./
RUN npm ci --omit=dev

# ---- Runtime stage ----
FROM node:22-alpine AS runtime

# Create non-root working directory
WORKDIR /app

# Copy production node_modules from builder
COPY --from=builder /app/node_modules ./node_modules

# Copy application source
COPY src/ ./src/

# Copy package.json for version / metadata
COPY package.json ./

# Use the built-in non-root 'node' user (UID 1000)
USER node

EXPOSE 3001

CMD ["node", "src/server.js"]
