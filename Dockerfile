FROM keymetrics/pm2:latest-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available) to the working directory
COPY package*.json ./

# Install the application dependencies
ENV NPM_CONFIG_LOGLEVEL warn
RUN npm install --production

# Bundle the app source inside the Docker image
COPY . .

# Expose the port the app runs on
# EXPOSE 3000

# Define the command to run the app
CMD [ "pm2-runtime", "index.js" ]
