#!/bin/bash
set -e

# Configuration
DOMAIN="chatapp.example.com"
EMAIL="admin@example.com"
DEPLOY_DIR="/opt/chatapp/prod"
NGINX_CONTAINER="chatapp-nginx"

# Function to check if certificate exists
check_cert() {
    if [ -d "/etc/letsencrypt/live/$DOMAIN" ]; then
        echo "Certificate already exists for $DOMAIN"
        return 0
    else
        return 1
    fi
}

# Function to obtain new certificate
obtain_cert() {
    echo "Obtaining new SSL certificate for $DOMAIN..."
    docker run --rm -it \
        -v "/etc/letsencrypt:/etc/letsencrypt" \
        -v "/var/lib/letsencrypt:/var/lib/letsencrypt" \
        -p 80:80 \
        certbot/certbot certonly \
        --standalone \
        --agree-tos \
        --non-interactive \
        --email "$EMAIL" \
        -d "$DOMAIN"
}

# Function to renew certificate
renew_cert() {
    echo "Attempting to renew SSL certificate..."
    docker run --rm \
        -v "/etc/letsencrypt:/etc/letsencrypt" \
        -v "/var/lib/letsencrypt:/var/lib/letsencrypt" \
        certbot/certbot renew --quiet
}

# Function to copy certificates to nginx
copy_certs() {
    echo "Copying certificates to Nginx directory..."
    mkdir -p "$DEPLOY_DIR/nginx/ssl/live/$DOMAIN"
    cp -L "/etc/letsencrypt/live/$DOMAIN/"* "$DEPLOY_DIR/nginx/ssl/live/$DOMAIN/"
}

# Function to reload nginx
reload_nginx() {
    echo "Reloading Nginx configuration..."
    docker exec "$NGINX_CONTAINER" nginx -s reload
}

# Main execution
main() {
    if ! check_cert; then
        obtain_cert
    else
        renew_cert
    fi
    
    copy_certs
    reload_nginx
    
    echo "SSL certificate setup/renewal completed successfully"
}

main 