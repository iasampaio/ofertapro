FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

# Pasta persistente do banco SQLite
RUN mkdir -p /app/data

EXPOSE 3333

CMD ["npm", "start"]
