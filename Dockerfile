FROM node:22-alpine

RUN apk add --no-cache \
    bash \
    python3 \
    py3-pip \
    make \
    g++ \
    cairo-dev \
    pango-dev \
    pangomm-dev \
    giflib-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    libpng-dev \
    libtool \
    autoconf \
    automake


WORKDIR /app
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY cli/package*.json ./cli/

RUN npm install
RUN npm install -g nodemon

COPY . .

EXPOSE 3000

CMD ["bash"]