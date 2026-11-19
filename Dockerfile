FROM nginx:1.31.9-alpine

COPY dist/. /usr/share/nginx/html