FROM oven/bun:1.3-alpine

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY src/ ./src/
COPY public/ ./public/

RUN mkdir -p /app/data

ENV PORT=3000
ENV DB_PATH=/app/data/oiltrac.db

EXPOSE 3000

CMD ["bun", "run", "src/server.ts"]
