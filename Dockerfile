FROM node:20.18.0-alpine3.20 AS builder

# Create app directory

WORKDIR /usr/src/app

RUN apk --virtual build-dependencies add \
    git libtool curl jq py3-configobj py3-pip py3-setuptools python3 python3-dev g++ make libusb-dev eudev-dev linux-headers && ln -sf python3 /usr/bin/python

RUN ln -s /lib/arm-linux-gnueabihf/libusb-1.0.so.0 libusb-1.0.dll

COPY package*.json ./
COPY yarn.lock ./

# Installing dependencies
RUN yarn cache clean
RUN yarn install --frozen-lockfile --unsafe-perm
RUN yarn add usb
# Copying files from current directory

COPY . .

# Create build and link

RUN yarn build

ENTRYPOINT ["node", "/usr/src/app/dist/index.js"]

CMD ["daemon"]
