# ---------- 构建阶段 ----------
FROM node:22-alpine AS build
WORKDIR /app

# 先装依赖（利用层缓存）
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

# 拷贝源码并构建
COPY . .
RUN npm run build

# ---------- 运行阶段 ----------
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
