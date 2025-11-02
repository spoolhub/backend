FROM node:22-alpine AS development
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile
COPY src src
COPY nest-cli.json nest-cli.json 
COPY tsconfig.json tsconfig.json 
COPY tsconfig.build.json tsconfig.build.json
RUN pnpm build

FROM node:22-alpine AS production
ENV NODE_ENV=production
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm
RUN pnpm install --prod --frozen-lockfile --ignore-scripts
COPY --from=development /app/dist ./dist
CMD ["node", "dist/main"]
