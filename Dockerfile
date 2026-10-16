# ---- Stage 1: build ----
FROM node:20-slim AS build
WORKDIR /app

# Prisma's engines need OpenSSL, which the slim image doesn't ship
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

# Copy only the manifests first so this layer is cached until dependencies change
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# tsc needs the generated Prisma types, which npm ci doesn't produce.
# The Prisma + googleapis types exceed Node's default ~2GB heap, so raise it for the build only.
RUN npx prisma generate && NODE_OPTIONS=--max-old-space-size=4096 npm run build

# ---- Stage 2: runtime ----
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Generate the Prisma client against the production node_modules
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npx prisma generate

COPY --from=build /app/dist ./dist

# Resume uploads are written under ./var, so the non-root user must own it
RUN mkdir -p var/jobtrackr-resumes && chown -R node:node /app/var
USER node

EXPOSE 4000
CMD ["node", "dist/main"]
