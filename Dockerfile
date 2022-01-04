FROM node:14-alpine3.12 AS builder

# Create app directory

WORKDIR /usr/src/app

RUN apk --virtual build-dependencies add \
    libtool curl jq py3-configobj py3-pip py3-setuptools python3 python3-dev g++ make libusb-dev eudev-dev linux-headers && ln -sf python3 /usr/bin/python

RUN ln -s /lib/arm-linux-gnueabihf/libusb-1.0.so.0 libusb-1.0.dll

COPY package*.json ./
COPY yarn.lock ./

# Installing dependencies

RUN yarn install --frozen-lockfile --unsafe-perm
RUN yarn add usb --build-from-source
# Copying files from current directory

COPY . .

# Create build and link

RUN yarn build

ENTRYPOINT ["node", "/usr/src/app/dist/index.js"]

CMD ["daemon"]
