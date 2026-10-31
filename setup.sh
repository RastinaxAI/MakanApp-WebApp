#!/usr/bin/env bash
set -e

if [ "$(id -u)" -ne 0 ]; then
  echo 'Run this script with sudo.' >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get upgrade -y
apt-get install -y nginx ufw certbot python3-certbot-nginx
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

install -d -m 755 /var/www/makanapp/app
if [ ! -e /var/www/makanapp/app/index.html ]; then
  cat > /var/www/makanapp/app/index.html <<'HTML'
<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>MakanApp</title></head><body><h1>MakanApp - Web App is Ready</h1></body></html>
HTML
fi
chown www-data:www-data /var/www/makanapp /var/www/makanapp/app
chmod 755 /var/www/makanapp /var/www/makanapp/app
chmod 644 /var/www/makanapp/app/index.html

cat > /etc/nginx/sites-available/makanapp-app.conf <<'NGINX'
server {
    listen 80;
    listen [::]:80;
    server_name app.makanapp.org;
    root /var/www/makanapp/app;
    index index.html;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/javascript application/javascript application/json application/xml image/svg+xml;

    error_page 502 503 504 = /__makan_placeholder.html;
    location = /__makan_placeholder.html {
        internal;
        alias /var/www/makanapp/app/index.html;
        add_header Cache-Control "no-store, no-cache, must-revalidate, max-age=0" always;
    }

    location ~ ^/(index\.html|sw\.js|service-worker\.js)$ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_hide_header Cache-Control;
        add_header Cache-Control "no-store, no-cache, must-revalidate, max-age=0" always;
    }

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
NGINX

rm -f /etc/nginx/sites-enabled/default
ln -sfn /etc/nginx/sites-available/makanapp-app.conf /etc/nginx/sites-enabled/makanapp-app.conf
nginx -t
systemctl restart nginx
certbot --nginx --non-interactive --agree-tos --redirect -m rastinaxoffice@gmail.com -d app.makanapp.org
