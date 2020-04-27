FROM node:12.16.2-stretch

RUN mkdir /work/
WORKDIR /work/
COPY package.json /work/
COPY package-lock.json /work/
RUN npm install

COPY ./anyproxy /work/anyproxy/
RUN /work/anyproxy/bin/anyproxy-ca --generate
RUN mkdir /work/ssl/
RUN cp /root/.anyproxy/certificates/rootCA.crt /work/ssl/
RUN cp /root/.anyproxy/certificates/rootCA.key /work/ssl/

# Copy over and build front-end
COPY gui /work/gui
WORKDIR /work/gui
RUN npm install
RUN npm run build

WORKDIR /work/

COPY utils.js /work/
COPY api-server.js /work/
COPY server.js /work/
COPY database.js /work/
COPY docker-entrypoint.sh /work/

# For debugging/hot-reloading
#RUN npm install -g nodemon

ENTRYPOINT ["/work/docker-entrypoint.sh"]
#ENTRYPOINT ["node", "/work/server.js"]
