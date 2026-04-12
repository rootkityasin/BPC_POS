FROM node:22-bookworm-slim

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable

COPY package.json pnpm-workspace.yaml ./

RUN pnpm install --no-frozen-lockfile

COPY . .

RUN pnpm prisma:generate && pnpm build

EXPOSE 3000

CMD ["pnpm", "exec", "next", "start", "--hostname", "0.0.0.0", "--port", "3000"]
