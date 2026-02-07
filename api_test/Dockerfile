# Minimal Node.js image for kimi_server.js
FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy server files
COPY kimi_server.js ./

# Expose the server port
EXPOSE 3050

# Run the server
CMD ["node", "kimi_server.js"]
