FROM node:14.17.5

# Create app directory

WORKDIR /usr/src/app

RUN apt-get update && apt-get install -y libusb-1.0-0-dev usbutils

RUN ln -s /lib/arm-linux-gnueabihf/libusb-1.0.so.0 libusb-1.0.dll

COPY package*.json ./

# Installing dependencies

RUN npm install

# Copying files from current directory

COPY . .

# Create build and link

RUN npm run build

RUN npm link

ENTRYPOINT ["tatum-kms"]

CMD ["daemon"]
