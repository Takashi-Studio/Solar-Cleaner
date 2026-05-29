# مرحلة البناء (Build Stage)
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install
COPY . .
RUN npm run build

# مرحلة التشغيل (Production Stage)
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install --only=production
COPY --from=builder /app/dist ./dist
EXPOSE 5000
CMD ["node", "dist/index.js"]
