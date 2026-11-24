# ChaserPilot production image. Two stages: the runtime carries no build toolchain
# and no dev dependencies.

FROM node:22-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY prisma ./prisma
RUN npx prisma generate
COPY --from=build /app/build ./build
COPY server.mjs ./
COPY scripts/migrate-with-retry.mjs ./scripts/
USER node
EXPOSE 3000
# Applies pending migrations (forward-only, never a reset), then serves.
CMD ["npm", "run", "docker-start"]
