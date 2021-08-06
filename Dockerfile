FROM node:14 

# Create app directory 
WORKDIR /usr/src/app 

# install app dependencies for package.json and package.lock.json 
COPY package*.json ./ 

RUN npm install 

COPY . . 


CMD npm run build && npm link 