FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ENV NODE_OPTIONS="--max-old-space-size=4096"
RUN npm run build
RUN mv dist dist_tmp && mkdir -p dist/siaps && mv dist_tmp/* dist/siaps
EXPOSE 4000
CMD ["npx", "serve", "-s", "dist/siaps", "-l", "4000"]