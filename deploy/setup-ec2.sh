#!/bin/bash
set -e

EC2_IP=$(curl -s http://checkip.amazonaws.com)

echo "================================================"
echo "  Second Brain — EC2 Setup"
echo "  Detected EC2 IP: $EC2_IP"
echo "================================================"
echo ""

# ---------------------------------------
# 1. System dependencies
# ---------------------------------------
sudo apt update
sudo apt install -y nginx git curl

curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs

echo "Node.js: $(node --version)"
echo "npm:     $(npm --version)"

# ---------------------------------------
# 2. Clone repo
# ---------------------------------------
cd /home/ubuntu
git clone https://github.com/Surajjoshi2004/digital-secondbrain.git
cd digital-secondbrain

# ---------------------------------------
# 3. Build frontend
# ---------------------------------------
echo ""
echo "--- Building frontend ---"
cd frontend
npm ci
npm run build
cd ..

# ---------------------------------------
# 4. Setup backend
# ---------------------------------------
echo ""
echo "--- Setting up backend ---"
cd backend
npm ci

# Prompt for sensitive values
read -r -p "Enter your MongoDB Atlas URI: " MONGODB_URI
read -r -p "Enter your JWT secret (min 32 chars): " JWT_SECRET

cat > .env << EOF
PORT=5000
NODE_ENV=production
MONGODB_URI=$MONGODB_URI
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=7d
COOKIE_SAME_SITE=lax
CLIENT_URL=http://$EC2_IP
EOF

echo ".env created"

# ---------------------------------------
# 5. Configure nginx
# ---------------------------------------
echo ""
echo "--- Configuring nginx ---"

sudo tee /etc/nginx/sites-available/default > /dev/null << 'NGINX'
server {
    listen 80;
    server_name _;

    root /home/ubuntu/digital-secondbrain/frontend/dist;
    index index.html;

    gzip on;
    gzip_types text/css application/javascript text/plain image/svg+xml;
    gzip_min_length 256;

    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "public, max-age=3600";
    }
}
NGINX

sudo nginx -t
sudo systemctl reload nginx

# ---------------------------------------
# 6. PM2 — auto-start backend
# ---------------------------------------
echo ""
echo "--- Setting up PM2 ---"
sudo npm i -g pm2

pm2 start /home/ubuntu/digital-secondbrain/backend/server.js --name second-brain
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu

echo ""
echo "================================================"
echo "  Deployment complete!"
echo "  Access your app at: http://$EC2_IP"
echo ""
echo "  Useful commands:"
echo "    pm2 logs           — View backend logs"
echo "    pm2 restart second-brain  — Restart backend"
echo "    sudo systemctl reload nginx  — Reload nginx"
echo "================================================"
