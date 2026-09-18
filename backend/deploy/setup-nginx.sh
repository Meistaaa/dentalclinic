#!/usr/bin/env bash
set -euo pipefail

# Run as root after the API has started. The public IP is an Elastic IP.
PUBLIC_IP=52.71.155.97
EC2_DNS=ec2-52-71-155-97.compute-1.amazonaws.com
SITE=/etc/nginx/sites-available/dentalclinic-backend
CHALLENGE_ROOT=/var/www/letsencrypt
CERTBOT=/opt/certbot/bin/certbot
CERT_DIR="/etc/letsencrypt/live/$PUBLIC_IP"

if [[ $(id -u) -ne 0 ]]; then
  echo 'Run setup-nginx.sh with sudo' >&2
  exit 1
fi

if ! command -v nginx >/dev/null 2>&1; then
  apt-get update -y
  apt-get install -y nginx
fi

install -d -m 755 "$CHALLENGE_ROOT/.well-known/acme-challenge"

# The HTTP site serves ACME challenges before a certificate exists. If issuance
# fails, the API remains reachable over HTTP while the deployment reports why.
if [[ ! -s "$CERT_DIR/fullchain.pem" ]]; then
  cat > "$SITE" <<NGINX
server {
    listen 80;
    server_name $PUBLIC_IP $EC2_DNS;

    location ^~ /.well-known/acme-challenge/ {
        root $CHALLENGE_ROOT;
        default_type text/plain;
    }

    location = / { return 302 /api/v1/health; }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX
  ln -sfn "$SITE" /etc/nginx/sites-enabled/dentalclinic-backend
  nginx -t
  systemctl enable --now nginx
  systemctl reload nginx

  if [[ ! -x "$CERTBOT" ]]; then
    apt-get install -y python3-venv
    python3 -m venv /opt/certbot
    /opt/certbot/bin/python -m pip install --upgrade 'certbot>=5.4'
  fi

  "$CERTBOT" certonly --non-interactive --agree-tos \
    --register-unsafely-without-email \
    --preferred-profile shortlived \
    --webroot --webroot-path "$CHALLENGE_ROOT" \
    --ip-address "$PUBLIC_IP"
fi

cat > "$SITE" <<NGINX
server {
    listen 80;
    server_name $PUBLIC_IP $EC2_DNS;

    location ^~ /.well-known/acme-challenge/ {
        root $CHALLENGE_ROOT;
        default_type text/plain;
    }

    location / { return 301 https://$PUBLIC_IP\$request_uri; }
}

server {
    listen 443 ssl;
    server_name $PUBLIC_IP;
    ssl_certificate $CERT_DIR/fullchain.pem;
    ssl_certificate_key $CERT_DIR/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    location = / { return 302 /api/v1/health; }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX

ln -sfn "$SITE" /etc/nginx/sites-enabled/dentalclinic-backend
nginx -t
systemctl enable --now nginx
systemctl reload nginx

# IP certificates last about six days. Check twice daily and reload Nginx
# only when Certbot renews the certificate.
cat > /etc/systemd/system/dentalclinic-cert-renew.service <<'UNIT'
[Unit]
Description=Renew Dental Clinic IP TLS certificate

[Service]
Type=oneshot
ExecStart=/opt/certbot/bin/certbot renew --quiet --deploy-hook "/usr/bin/systemctl reload nginx"
UNIT

cat > /etc/systemd/system/dentalclinic-cert-renew.timer <<'UNIT'
[Unit]
Description=Check Dental Clinic TLS certificate twice daily

[Timer]
OnCalendar=*-*-* 03:00:00
OnCalendar=*-*-* 15:00:00
RandomizedDelaySec=30m
Persistent=true

[Install]
WantedBy=timers.target
UNIT

systemctl daemon-reload
systemctl enable --now dentalclinic-cert-renew.timer
curl --fail --silent --show-error --max-time 10 \
  --resolve "$PUBLIC_IP:443:127.0.0.1" \
  "https://$PUBLIC_IP/api/v1/health"
