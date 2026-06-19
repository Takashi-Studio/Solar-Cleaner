# مرحلة البناء (Build Stage)
FROM node:18-alpine AS builder
# تثبيت OpenSSL لتمكين Prisma من كشف البيئة ومطابقتها أثناء البناء
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install
COPY . .
RUN npm run build

# مرحلة التشغيل (Production Stage)
FROM node:18-alpine
# تثبيت OpenSSL لضمان تحميل محركات Prisma التوافقية بشكل ممتاز عند التشغيل
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm install --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/firmware ./firmware
EXPOSE 5000
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node dist/index.js"]
