FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci && npx playwright install --with-deps chromium
COPY . .
RUN npm run build && npm prune --omit=dev
ENV NODE_ENV=production
ENV PORT=10000
ENV DATA_DIR=/app/storage
EXPOSE 10000
CMD ["npm", "start"]
