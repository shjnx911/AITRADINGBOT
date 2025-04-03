FROM node:20 AS base
FROM ubuntu:22.04 AS rocm-base
ENV ROCM_VERSION=6.0.2
ENV DEBIAN_FRONTEND=noninteractive
ENV ROCM_PATH=/opt/rocm
ENV PATH="$ROCM_PATH/bin:$PATH"
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates gnupg git cmake build-essential libnuma-dev libpci3 libstdc++-12-dev ocl-icd-libopencl1 clinfo python3-full python3-pip python3-venv libpq-dev && rm -rf /var/lib/apt/lists/*
RUN curl -fsSL https://repo.radeon.com/rocm/rocm.gpg.key | gpg --dearmor -o /etc/apt/trusted.gpg.d/rocm.gpg && echo "deb [arch=amd64] https://repo.radeon.com/rocm/apt/$ROCM_VERSION jammy main" > /etc/apt/sources.list.d/rocm.list
RUN apt-get update && apt-get install -y --no-install-recommends \
    rocm-dev \
    rocminfo \
    rocm-opencl-dev \
    && rm -rf /var/lib/apt/lists/*

FROM base AS node-builder
WORKDIR /app
COPY package*.json .
RUN npm install
COPY . .
RUN npm run build

RUN npx esbuild server/bot.ts --platform=node --bundle --format=cjs --outfile=dist/bot.cjs

FROM node-builder AS production
WORKDIR /app
COPY package*.json ./
COPY --from=node-builder /app/node_modules ./node_modules
COPY --from=node-builder /app/dist ./dist
RUN apt-get update && apt-get install -y --no-install-recommends python3-venv && rm -rf /var/lib/apt/lists/*
RUN python3 -m venv /app/venv
ENV PATH="/app/venv/bin:$PATH:/usr/local/lib"
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt
ENV NODE_ENV=production
ENV PORT=3000
ENV HSA_OVERRIDE_GFX_VERSION=9.0.0
ENV TF_ROCM_FUSION_ENABLE=1
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 CMD curl -f http://localhost:$PORT/api/health || exit 1
CMD ["npm", "run", "start"]

FROM rocm-base AS bot-base
FROM node-builder as bot-only 
WORKDIR /app
COPY package*.json ./
COPY --from=node-builder /app/node_modules ./node_modules
COPY --from=node-builder /app/dist ./dist
COPY requirements.txt .
RUN apt-get update && apt-get install -y --no-install-recommends python3-venv && rm -rf /var/lib/apt/lists/*
RUN python3 -m venv /app/venv-bot
ENV PATH="/app/venv-bot/bin:$PATH:/usr/local/lib"
RUN pip3 install --no-cache-dir -r requirements.txt

ENV BOT_ONLY=true
ENV NODE_ENV=production
ENV HSA_OVERRIDE_GFX_VERSION=9.0.0
ENV TF_ROCM_FUSION_ENABLE=1

CMD ["node", "dist/bot.cjs"]