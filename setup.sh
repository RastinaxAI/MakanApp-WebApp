#!/usr/bin/env bash
set -Eeuo pipefail

STAGE='arguments'
trap 'code=$?; printf "MakanApp: stage failed: %s (exit %s). No session volume was removed.\n" "$STAGE" "$code" >&2; exit "$code"' ERR

usage() {
  cat <<'HELP'
Usage:
  sudo bash setup.sh --update [--app-dir /var/www/makanapp/app]
  sudo bash setup.sh --install

--update       Build and replace only the existing Makan client; preserve env, sessions, Nginx and TLS.
--install      Provision Nginx/firewall/TLS on a new server. Does not deploy application source.
--app-dir      Application root containing web/compose.yaml (update only).
--help         Show this help. No arguments also shows help.

Upload the new source before --update. This script does not pull Git or overwrite .env.docker.
HELP
}

die() { printf 'MakanApp: %s\n' "$*" >&2; exit 1; }
require_command() { command -v "$1" >/dev/null 2>&1 || die "Required command not found: $1"; }

MODE=''
APP_DIR=''
while (($#)); do
  case "$1" in
    --update|--install)
      [[ -z "$MODE" ]] || die 'Choose either --update or --install.'
      MODE="$1"
      shift
      ;;
    --app-dir)
      [[ $# -ge 2 && -n "$2" ]] || die '--app-dir requires a path.'
      APP_DIR="$2"
      shift 2
      ;;
    --help|-h) usage; exit 0 ;;
    *) usage >&2; die "Unknown argument: $1" ;;
  esac
done
if [[ -z "$MODE" ]]; then usage; exit 0; fi
[[ "$(id -u)" == '0' ]] || die 'Run this script with sudo.'

update_app() {
  STAGE='update preflight'
  require_command docker
  require_command flock
  require_command sha256sum
  local script_dir
  script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
  if [[ -z "$APP_DIR" ]]; then
    if [[ -f "$script_dir/web/compose.yaml" ]]; then APP_DIR="$script_dir";
    else APP_DIR='/var/www/makanapp/app'; fi
  fi
  [[ -d "$APP_DIR" ]] || die 'Application directory does not exist; use --app-dir.'
  APP_DIR="$(cd -- "$APP_DIR" && pwd -P)"
  local web_dir="$APP_DIR/web"
  [[ -f "$web_dir/compose.yaml" && -f "$web_dir/Dockerfile" && -f "$web_dir/package-lock.json" ]] || die 'Upload the complete application source, including web/, before updating.'
  [[ -f "$web_dir/.env.docker" ]] || die 'Existing web/.env.docker is missing. Restore the server configuration; update will not create or replace secrets.'

  # A fixed project name retains the existing makan-client_sessions volume.
  # The local HTTP override is deliberately never loaded on the public server.
  local -a compose=(docker compose --env-file "$web_dir/.env.docker" --project-name makan-client --file "$web_dir/compose.yaml")
  local env_digest
  env_digest="$(sha256sum -- "$web_dir/.env.docker")"
  docker info >/dev/null
  docker compose version >/dev/null

  # Serialize deployments without writing lock files into the source tree.
  install -d -m 700 /run/lock/makan-client
  exec 9>>/run/lock/makan-client/update.lock
  flock -n 9 || die 'Another Makan client update is running. Wait for it to finish.'

  "${compose[@]}" config --quiet
  printf 'MakanApp: building the uploaded source in %s\n' "$APP_DIR"
  STAGE='image build (existing container is kept running)'
  "${compose[@]}" build web

  STAGE='configuration consistency check'
  [[ "$env_digest" == "$(sha256sum -- "$web_dir/.env.docker")" ]] || die '.env.docker changed during the build. Deployment stopped; review it and run --update again.'

  STAGE='application replacement and health check'
  "${compose[@]}" up -d --no-deps --no-build --wait --wait-timeout 180 web
  "${compose[@]}" ps web
  printf 'MakanApp: update completed; the web health check passed. Existing env and session volume were retained.\n'
}

install_server() {
  [[ -z "$APP_DIR" ]] || die '--app-dir is supported only with --update.'
  [[ ! -e /etc/nginx/sites-available/makanapp-app.conf ]] || die 'Makan Nginx is already configured. Use --update for application changes.'
  STAGE='initial server provisioning'
export DEBIAN_FRONTEND=noninteractive
apt-get update
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

}

case "$MODE" in
  --update) update_app ;;
  --install) install_server ;;
esac
