FROM node:14.17.5



# Create app directory 

WORKDIR /usr/src/app 

RUN apt-get update

RUN apt-get install -y libusb-1.0-0-dev usbutils

RUN ln -s /lib/arm-linux-gnueabihf/libusb-1.0.so.0 libusb-1.0.dll





COPY package*.json ./ 



RUN npm install 



COPY . . 

RUN npm run build 

RUN npm link



# ENTRYPOINT /usr/local/bin/tatum-kms



CMD ["tatum-kms","daemon"]