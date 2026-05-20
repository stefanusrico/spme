FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENV NODE_OPTIONS="--max-old-space-size=4096"

RUN npm run build

EXPOSE 4000

CMD ["npx", "serve", "-s", "dist", "-l", "4000"]
