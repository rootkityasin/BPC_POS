FROM node:24-alpine

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-workspace.yaml ./

RUN pnpm install

COPY . .

EXPOSE 3000

CMD ["sh", "-c", "pnpm setup && pnpm dev --hostname 0.0.0.0"]
