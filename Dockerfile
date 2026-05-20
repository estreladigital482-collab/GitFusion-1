FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3737

COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev

COPY . .
RUN npm run build

EXPOSE 3737
CMD ["npm", "start"]
