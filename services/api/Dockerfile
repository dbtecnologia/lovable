FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY services/api/package.json services/api/package.json
COPY prisma prisma
RUN npm install
RUN npx prisma generate
COPY services/api services/api
WORKDIR /app/services/api
RUN npm run build
EXPOSE 4000
CMD ["npm", "start"]
