FROM node:18.20.5-alpine3.20 AS builder

# Create app directory
WORKDIR /opt/app

RUN apk --virtual build-dependencies add \
    git libtool curl jq py3-configobj py3-pip py3-setuptools python3 python3-dev \
    g++ make libusb-dev eudev-dev linux-headers \
&& ln -sf python3 /usr/bin/python \
&& ln -s /lib/arm-linux-gnueabihf/libusb-1.0.so.0 libusb-1.0.dll

COPY package*.json ./
COPY yarn.lock ./

# Installing dependencies
RUN yarn cache clean \
&& yarn install --frozen-lockfile --unsafe-perm --ignore-scripts \
&& yarn add usb
# Copying files from current directory

COPY . .

# Create build and link
RUN yarn build

# Switch to the non-root user
USER node

ENTRYPOINT ["node", "/opt/app/dist/index.js"]

CMD ["daemon"]
