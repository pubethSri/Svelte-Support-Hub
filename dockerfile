FROM oven/bun:1.0.25

WORKDIR /app

COPY bun.lockb package.json ./
RUN bun install

COPY . .

ARG VITE_BACKEND_URL
ENV VITE_BACKEND_URL=${VITE_BACKEND_URL}

EXPOSE 5173

CMD ["bun", "run", "dev", "--host"]
