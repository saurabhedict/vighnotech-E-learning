# Vigno Smart Class API
FROM node:20-alpine
WORKDIR /app

# The shared package is a local file: dependency — copy it first so npm can link it.
COPY shared ./shared
COPY backend/package*.json ./backend/
WORKDIR /app/backend
RUN npm install --omit=dev

# App source
COPY backend/ ./
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "src/index.js"]
