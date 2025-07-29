FROM node:22.14.0-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to container
COPY package*.json ./

# Set production environment on build
RUN npm ci --only=production

# Create a non-root user to run the application for security purposes
RUN addgroup -g 1001 -S nodejs
RUN adduser -S gameserver -u 1001

COPY . .

RUN chown -R gameserver:nodejs /usr/src/app
USER gameserver

EXPOSE 3000

CMD ["node", "server.js"]