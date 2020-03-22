# vinas_server

A web-based NAS system(developing)



## How to test this project

1. Install dependencies

   ```shell
   $ npm install
   ```

   

2. Edit env file(/.env)

   For example:

   ```Env
   PORT=8888
   MONGODB_HOST=192.168.2.10
   MONGODB_PORT=27017
   MONGODB_USERNAME=admin
   MONGODB_PASSWORD=123456
   MONGODB_DEFAULTDB=vinas
   ACCESSKEY=accessToken
   REFRESHKEY=refreshToken
   ACCESSTOKEN_TIMEOUT=30m
   REFRESHTOKEN_TIMEOUT=3h
   FILESTORE_PATH_DEFAULT=files
   ```



3. Run server

   ```bash
   $ npm run dev
   ```

   

4. Use client to test HTTP APIs

   Ref: https://github.com/40443219/vinas_react