FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY services/whatsapp-worker/package.json services/whatsapp-worker/package.json
RUN npm install
COPY services/whatsapp-worker services/whatsapp-worker
WORKDIR /app/services/whatsapp-worker
RUN npm run build
CMD ["npm", "start"]
