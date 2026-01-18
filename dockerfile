FROM oven/bun:1.0.25

WORKDIR /app

COPY bun.lockb package.json ./
RUN bun install

COPY . .

# Vite dev server OR preview server
EXPOSE 5173

CMD ["bun", "run", "dev", "--host"]