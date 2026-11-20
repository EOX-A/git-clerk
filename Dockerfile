FROM nginx:1.31.9-alpine

COPY dist-v2/. /usr/share/nginx/html