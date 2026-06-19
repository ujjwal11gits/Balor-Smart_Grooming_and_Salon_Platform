# Comprehensive AWS EC2 Deployment Guide
### Node.js (Express) + React (Vite) + MongoDB (Cloud Atlas)

This guide contains step-by-step instructions for deploying a modern full-stack application on Amazon Web Services (AWS) using an EC2 virtual server. It includes scenarios for deploying **with a custom domain (via Cloudflare)** and **without a domain (IP-only)**.

---

## 🛠️ Prerequisites
* An active AWS Account.
* Git Bash (for Windows users) or Terminal (for macOS/Linux).
* A GitHub repository containing your project.
* A cloud database (like MongoDB Atlas) with an active connection string.

---

## 📋 General Placeholders vs. Project Examples
In commands, replace these placeholders with your actual details:
* `<your-ip>` $\rightarrow$ *Example: `35.154.20.254`*
* `<your-key.pem>` $\rightarrow$ *Example: `./ujjwal_domain.pem` (assuming it is inside your project folder)*
* `<your-repo-url>` $\rightarrow$ *Example: `https://github.com/ujjwal11gits/Balor-Smart_Grooming_and_Salon_Platform.git`*
* `<your-project-folder>` $\rightarrow$ *Example: `Balor-Smart_Grooming_and_Salon_Platform`*
* `<your-domain>` $\rightarrow$ *Example: `balor.ujjwalchoubey.me`*

---

# 🚀 Phase 1: Setting up the Virtual Machine

### **Step 1: Launch the EC2 Instance**
* **What it does:** Rents a remote virtual computer in the cloud running 24/7.
* **Instructions:**
  1. Log into your [AWS Management Console](https://aws.amazon.com/).
  2. Search for **EC2** and click the orange **Launch instance** button.
  3. Configure the following:
     * **Name:** `your-project-server`
     * **OS (AMI):** Select **Ubuntu** (Ubuntu Server 24.04 LTS or 22.04 LTS - *Free tier eligible*).
     * **Instance Type:** Select `t2.micro` or `t3.micro` (*Free tier eligible*).
     * **Key Pair:** Click **Create new key pair**. Set name (e.g. `your-key`), Key type: `RSA`, Private key format: `.pem`. Save the downloaded `.pem` file securely.
     * **Network Settings (Firewall):** Check the boxes to:
       * `[x]` Allow SSH traffic from Anywhere (`0.0.0.0/0`).
       * `[x]` Allow HTTPS traffic from the internet.
       * `[x]` Allow HTTP traffic from the internet.
     * **Configure Storage:** Select `8 GiB` or `15 GiB` of SSD storage (gp3).
  4. Click **Launch instance** and wait for the state to show **`Running`**. Copy the **Public IPv4 address**.

---

### **Step 2: Connect to the Server via SSH**
* **What it does:** Opens a secure command-line terminal on your remote cloud computer.
* **Instructions:**
  1. Open **Git Bash** on your local computer.
  2. Run the SSH command pointing to your downloaded `.pem` key file and your server IP:
     ```bash
     ssh -i /path/to/your-key.pem ubuntu@<your-ip>
     ```
     *Project Example:*
     Make sure you are in your project folder (`D:\Balor-Smart_Grooming_and_Salon_Platform`), then run:
     ```bash
     ssh -i ./ujjwal_domain.pem ubuntu@35.154.20.254
     ```
  3. When prompted, type `yes` and press **Enter**. Your terminal prompt will change to `ubuntu@ip-xxx-xx-xx-xx:~$`.

---

### **Step 3: Prepare the Server Environment**
* **What it does:** Updates the server OS and installs runtime tools (Node.js, NPM, and PM2).
* **Instructions:**
  1. **Update package lists:**
     ```bash
     sudo apt update
     ```
  2. **Add Node.js 20 LTS repository:**
     ```bash
     curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
     ```
  3. **Install Node.js:**
     ```bash
     sudo apt install -y nodejs
     ```
  4. **Verify installation:**
     ```bash
     node -v
     ```
  5. **Install PM2 globally:** (PM2 keeps your backend server running in the background continuously).
     ```bash
     sudo npm install -g pm2
     ```

---

# 📦 Phase 2: Deploying the Application Code

### **Step 4: Clone the Project**
* **What it does:** Downloads your application files from GitHub directly onto your cloud server.
* **Instructions:**
  1. Run the git clone command using your repository URL:
     ```bash
     git clone <your-repo-url>
     ```
     *Project Example:*
     ```bash
     git clone https://github.com/ujjwal11gits/Balor-Smart_Grooming_and_Salon_Platform.git
     ```

---

### **Step 5: Configure and Start the Backend**
* **What it does:** Installs server-side dependencies, creates configuration variables, and starts the backend service.
* **Instructions:**
  1. **Navigate and install packages:**
     ```bash
     cd <your-project-folder>/backend && npm install
     ```
  2. **Create the environment file:**
     ```bash
     cat << 'EOF' > .env
     PORT=5000
     MONGO_URI=your_mongodb_atlas_connection_string
     JWT_SECRET=your_secret_key
     JWT_REFRESH_SECRET=your_refresh_secret
     FRONTEND_URL=https://your-domain-or-ip
     
     # Optional SMTP / Mailing Credentials
     SMTP_HOST=smtp.gmail.com
     SMTP_PORT=587
     SMTP_USER=example@gmail.com
     SMTP_PASS=app_password_here
     
     SESSION_EXPIRY_DAYS=30
     EOF
     ```
  3. **Start the backend with PM2:**
     ```bash
     pm2 start server.js --name "project-backend"
     ```
     *Project Example:*
     ```bash
     pm2 start server.js --name "balor-backend"
     ```
  4. **Verify it is running and database is connected:**
     ```bash
     pm2 logs project-backend --no-daemon
     # Press Ctrl+C to exit logs view.
     ```

---

### **Step 6: Build the Frontend**
* **What it does:** Compiles React code into optimized, lightweight HTML/CSS/JS files for production.
* **Instructions:**
  1. **Navigate and install packages:**
     ```bash
     cd ../frontend && npm install
     ```
  2. **Build the production bundle:**
     ```bash
     npm run build
     ```
     *This creates a folder named `dist` (or `build`) containing static files that will be served to visitors.*

---

# 🌐 Phase 3: Routing traffic with Nginx

### **Step 7: Install Nginx**
* **What it does:** Installs the Nginx web server to listen for standard internet requests on HTTP port 80.
* **Instructions:**
  ```bash
  sudo apt install -y nginx
  ```

---

## 🛤️ Choose your Routing Setup: Scenario A or Scenario B

### **Scenario A: Deploying with a Custom Domain (Cloudflare Proxy)**
> Use this if you own a domain and want free HTTPS/SSL encryption automatically managed by Cloudflare.

1. **Configure Cloudflare DNS:**
   * Go to Cloudflare.
   * Add a DNS **A Record**: Name: `balor` (subdomain) or `@` (root), Value: `<your-ip>`, Proxy Status: **`Proxied`** (Orange Cloud).
   * Go to the **SSL/TLS** tab in Cloudflare and select **Flexible** encryption mode.
2. **Write Nginx Configuration on your AWS Server:**
   ```bash
   sudo tee /etc/nginx/sites-available/default << 'EOF'
   server {
       listen 80;
       server_name your-domain.com www.your-domain.com;

       root /home/ubuntu/<your-project-folder>/frontend/dist;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }

       # Proxies frontend requests starting with /api to the node backend
       location /api {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   EOF
   ```
   *Project Example:*
   ```bash
   # Replace server_name with balor.ujjwalchoubey.me
   # Replace root path with /home/ubuntu/Balor-Smart_Grooming_and_Salon_Platform/frontend/dist
   ```
3. **Allow Nginx access and test config:**
   ```bash
   chmod 755 /home/ubuntu
   sudo nginx -t
   sudo systemctl restart nginx
   ```

---

### **Scenario B: Deploying WITHOUT a Domain (Public IP Only)**
> Use this if you do not have a domain. Visitors will access the website directly via `http://<your-ip>`.

1. **Write Nginx Configuration:**
   ```bash
   sudo tee /etc/nginx/sites-available/default << 'EOF'
   server {
       listen 80 default_server;
       listen [::]:80 default_server;

       # Accept any request reaching this server IP
       server_name _;

       root /home/ubuntu/<your-project-folder>/frontend/dist;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }

       # Proxies API requests to backend
       location /api {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   EOF
   ```
2. **Allow Nginx access and test config:**
   ```bash
   chmod 755 /home/ubuntu
   sudo nginx -t
   sudo systemctl restart nginx
   ```

---

# 🛡️ Phase 4: Server Persistence & Upgrades

### **Step 10: Auto-Restart on Server Crashes/Reboots**
* **What it does:** Makes sure your application starts automatically if the server reboots.
* **Instructions:**
  1. Generate startup script:
     ```bash
     pm2 startup
     ```
  2. Copy the output command starting with `sudo env PATH=...` and run it in the terminal.
  3. Save the currently running list of processes:
     ```bash
     pm2 save
     ```

---

### **Step 11: How to Push Updates & Save Changes**
* **What it does:** Updates the code on the server and applies changes when you write new features locally.

#### **Method 1: Manual Update**
1. **Locally:** Push your changes to GitHub (`git push`).
2. **On AWS Server:** Log in and navigate to the project directory:
   ```bash
   cd /home/ubuntu/<your-project-folder>
   git pull
   ```
3. **Apply Backend Changes:**
   ```bash
   cd backend
   npm install  # (Only if you added new packages)
   pm2 restart project-backend
   ```
4. **Apply Frontend Changes:**
   ```bash
   cd ../frontend
   npm install  # (Only if you added new packages)
   npm run build
   ```

#### **Method 2: Automated Update (Single Command)**
1. Navigate to your project folder on the server: `cd /home/ubuntu/<your-project-folder>`
2. Create a script named `deploy.sh`:
   ```bash
   nano deploy.sh
   ```
3. Paste this script inside the file (adjusting the folder/backend names):
   ```bash
   #!/bin/bash
   echo "🚀 Pulling latest changes from Git..."
   git pull

   echo "📦 Installing backend packages..."
   cd backend
   npm install

   echo "🔄 Restarting backend process..."
   pm2 restart balor-backend

   echo "📦 Installing frontend packages..."
   cd ../frontend
   npm install

   echo "🏗️ Building frontend..."
   npm run build

   echo "✨ Deploy complete!"
   ```
4. Press `Ctrl + O` and `Enter` to save, and `Ctrl + X` to exit.
5. Make the script executable:
   ```bash
   chmod +x deploy.sh
   ```
6. Now, whenever you push changes to GitHub, simply run this one command on your server:
   ```bash
   ./deploy.sh
   ```
