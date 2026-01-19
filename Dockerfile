FROM node:22-alpine

# Install system deps
RUN apk add --no-cache curl bash

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash

ENV PATH="/root/.bun/bin:$PATH"

WORKDIR /app

COPY bun.lock package.json ./
RUN bun install

COPY . .

ARG VITE_BACKEND_URL
ENV VITE_BACKEND_URL=${VITE_BACKEND_URL}

EXPOSE 5173

CMD ["bun", "run", "dev", "--host"]
