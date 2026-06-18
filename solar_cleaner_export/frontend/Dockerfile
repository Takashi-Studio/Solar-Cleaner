# مرحلة البناء (Build Stage)
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# مرحلة التقديم والتشغيل (Nginx Stage)
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# نسخ إعدادات Nginx الافتراضية للتعامل مع الروابط الداخلية
RUN echo 'server { listen 80; location / { root /usr/share/nginx/html; index index.html; try_files $uri $uri/ /index.html; } }' > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
