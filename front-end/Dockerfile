FROM nginx:alpine
RUN apk add --no-cache vim
COPY nginx.conf /etc/nginx/nginx.conf
COPY . /usr/share/nginx/html/
COPY config-prod.json /usr/share/nginx/html/config.json

# Expone el puerto 80
EXPOSE 80
# Nginx ya arranca por defecto