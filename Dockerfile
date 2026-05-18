FROM node:18-alpine

# Install build tools needed for better-sqlite3
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

# Create necessary directories
RUN mkdir -p uploads encrypted quarantine data

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

CMD ["node", "src/app.js"]
