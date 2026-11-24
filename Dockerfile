# Build the client in an isolated stage.
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/
RUN npm ci && npm --prefix server ci && npm --prefix client ci

COPY server ./server
COPY client ./client
RUN npm run build

# Runtime image contains only the server, its production dependencies, and built client.
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY server/package.json server/package-lock.json ./server/
RUN npm --prefix server ci --omit=dev

COPY server/index.js ./server/index.js
COPY server/middleware ./server/middleware
COPY server/routes ./server/routes
COPY server/services ./server/services
COPY server/utils ./server/utils
COPY --from=builder /app/client/dist ./client/dist

EXPOSE 5000
CMD ["node", "server/index.js"]
