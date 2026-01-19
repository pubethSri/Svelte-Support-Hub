FROM oven/bun:1 AS base
WORKDIR /usr/src/app

FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile


RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production


FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

ENV NODE_ENV=production
RUN bun --bun run build


FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=prerelease /usr/src/app/build .
COPY --from=prerelease /usr/src/app/package.json .



# run the app
USER bun
ENV PUBLIC_BACKEND_URL=${PUBLIC_BACKEND_URL}
EXPOSE 3000/tcp
ENTRYPOINT [ "bun", "--bun", "run", "index.js" ]








# FROM node:22-alpine

# # Install system deps
# RUN apk add --no-cache curl bash

# # Install Bun
# RUN curl -fsSL https://bun.sh/install | bash

# ENV PATH="/root/.bun/bin:$PATH"

# WORKDIR /app

# COPY bun.lock package.json ./
# RUN bun install

# COPY . .

# ARG PUBLIC_BACKEND_URL
# ENV PUBLIC_BACKEND_URL=${PUBLIC_BACKEND_URL}

# EXPOSE 5173

# CMD ["bun", "run", "dev", "--host"]
