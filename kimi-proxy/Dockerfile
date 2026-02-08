# Minimal Node.js image for Kimi OpenAI-compatible proxy
FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy server files
# Note: proxy.js is mounted as volume for development
# COPY proxy.js ./

# Expose the server port
EXPOSE 3050

# Run the server
CMD ["node", "proxy.js"]
