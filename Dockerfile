# build
FROM node:10 as build

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn --frozen-lockfile --production

COPY . .

RUN yarn build

# run
FROM nginx:alpine

COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
