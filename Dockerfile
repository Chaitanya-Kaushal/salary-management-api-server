# syntax=docker/dockerfile:1

# ---------- build stage ----------
FROM node:20-alpine AS build

WORKDIR /app

# Install all deps (incl. dev) for building
COPY package*.json ./
RUN npm ci

# Source needed for build + prisma generate
COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
COPY scripts ./scripts

RUN npx prisma generate
RUN npm run build

# ---------- runtime stage ----------
FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

# Production deps only (prisma CLI is in deps so `prisma migrate deploy` works)
COPY package*.json ./
RUN npm ci --omit=dev

# Built artifacts
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 4000

# Apply migrations then start the server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
