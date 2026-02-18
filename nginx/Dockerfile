# syntax=docker/dockerfile:1

FROM nginx:1.27-alpine

ARG NGINX_CONF=default.conf
COPY ${NGINX_CONF} /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
