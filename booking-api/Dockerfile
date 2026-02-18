# syntax=docker/dockerfile:1

FROM node:20 AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM node:20 AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20 AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/migrations ./migrations
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/all-us-counties.txt ./all-us-counties.txt
CMD ["sh", "-c", "node scripts/migrate.js && node scripts/seed.js && echo 'Starting booking-api...' && exec node dist/main.js"]
