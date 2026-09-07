FROM node:24-alpine AS build
WORKDIR /app
ENV DATABASE_URL=postgresql://zuarts:zuarts@localhost:5432/zuarts_conecta?schema=public
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/api/dist ./api/dist
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json
RUN npm ci --omit=dev
EXPOSE 3001
CMD ["node_modules/.bin/tsx", "api/dist/server.js"]
