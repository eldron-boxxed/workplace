# language: Dockerfile, file: .devcontainer/Dockerfile
FROM mcr.microsoft.com/devcontainers/javascript-node:1-20-bookworm

RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get install -y --no-install-recommends \
        xvfb \
        x11-utils \
        xauth \
        libnss3 \
        libnspr4 \
        libatk1.0-0 \
        libatk-bridge2.0-0 \
        libcups2 \
        libdrm2 \
        libxkbcommon0 \
        libxcomposite1 \
        libxdamage1 \
        libxfixes3 \
        libxrandr2 \
        libgbm1 \
        libpango-1.0-0 \
        libcairo2 \
        libasound2 \
        libatspi2.0-0 \
        libx11-xcb1 \
        libxcb-dri3-0 \
        libxshmfence1 \
        fonts-liberation \
        fonts-noto-color-emoji \
        ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /tmp/.X11-unix && chmod 1777 /tmp/.X11-unix

ENV DISPLAY=:99
ENV PLAYWRIGHT_BROWSERS_PATH=/home/node/.cache/ms-playwright
