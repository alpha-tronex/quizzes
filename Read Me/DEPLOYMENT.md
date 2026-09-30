> **Superseded by [../DEPLOY.md](../DEPLOY.md).** This app no longer deploys
> to Render/Heroku/Railway/DigitalOcean/AWS — it runs on a shared Hetzner VPS
> via Docker Compose, at https://quizmaster.alphatronex.com. See
> `../DEPLOY.md` for the current, accurate runbook. Everything below this
> point is kept only as historical/reference material for the "Local Setup"
> section; the platform-specific deployment options were never actually used
> in production and are now out of date (e.g. quiz data lives in MongoDB, not
> flat JSON files, and `JWT_SECRET` is a required env var not mentioned
> below).

# Quiz Master - Deployment Guide (historical — see banner above)

## Overview
This is a full-stack quiz application with Angular frontend and Node.js/Express backend with MongoDB.

## Prerequisites
- Node.js (v18 or higher)
- MongoDB database
- Git

## Local Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd quizzes
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd server && npm install && cd ..
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and update:
   - `MONGODB_URI`: Your MongoDB connection string
   - `PORT`: Server port (default: 3000)

4. **Build and run**
   ```bash
   npm run build
   npm run server
   ```

5. **Access the application**
   Open browser to `http://localhost:3000`

---

## Deployment Options

### Option 1: Heroku Deployment (Recommended for beginners)

1. **Install Heroku CLI**
   ```bash
   brew install heroku/brew/heroku  # macOS
   # or download from https://devcenter.heroku.com/articles/heroku-cli
   ```

2. **Login to Heroku**
   ```bash
   heroku login
   ```

3. **Create Heroku app**
   ```bash
   heroku create quiz-master-app
   ```

4. **Add MongoDB Atlas (Free tier)**
   - Go to https://www.mongodb.com/cloud/atlas
   - Create a free cluster
   - Get connection string (looks like: mongodb+srv://username:password@cluster.mongodb.net/userDB)

5. **Set environment variables**
   ```bash
   heroku config:set MONGODB_URI="your-mongodb-atlas-connection-string"
   heroku config:set NODE_ENV=production
   ```

6. **Deploy**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push heroku main
   ```

7. **Open your app**
   ```bash
   heroku open
   ```

---

### Option 2: Railway Deployment

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**
   ```bash
   railway login
   ```

3. **Initialize project**
   ```bash
   railway init
   ```

4. **Add MongoDB**
   - In Railway dashboard, add MongoDB plugin
   - Copy the connection string

5. **Set environment variables**
   ```bash
   railway variables set MONGODB_URI="your-mongodb-connection-string"
   railway variables set NODE_ENV=production
   ```

6. **Deploy**
   ```bash
   railway up
   ```

---

### Option 3: DigitalOcean App Platform

1. **Connect GitHub repository**
   - Go to DigitalOcean App Platform
   - Create new app
   - Connect your GitHub repository

2. **Configure build settings**
   - Build Command: `npm run build && cd server && npm install`
   - Run Command: `node server/server.js`

3. **Add MongoDB**
   - Use DigitalOcean Managed Database (MongoDB)
   - Or connect to MongoDB Atlas

4. **Set environment variables**
   - Add `MONGODB_URI`
   - Add `NODE_ENV=production`

5. **Deploy**
   - Click "Deploy" button

---

### Option 4: AWS (Advanced)

1. **EC2 Instance**
   - Launch Ubuntu instance
   - Install Node.js and MongoDB
   - Clone repository
   - Set up PM2 for process management
   - Configure nginx as reverse proxy

2. **Or use AWS Elastic Beanstalk**
   - Create Node.js application
   - Upload code
   - Configure environment variables
   - Deploy

---

## Production Checklist

- [ ] MongoDB connection string is secure (use MongoDB Atlas)
- [ ] Environment variables are set correctly
- [ ] `.env` file is NOT committed to git
- [ ] Build is successful (`npm run build`)
- [ ] All dependencies are installed
- [ ] Server starts without errors
- [ ] `JWT_SECRET` is set (server refuses to boot otherwise)
- [ ] Quizzes exist in the `Quiz` MongoDB collection (quizzes are no longer
      stored as flat `server/quizzes/*.json` files — see
      `server/scripts/migrate_quizzes_to_mongo.js`)
- [ ] Test login/register functionality
- [ ] Test quiz taking and saving
- [ ] Test quiz history view

---

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/userDB` |
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment mode | `production` |
| `JWT_SECRET` | **Required.** Server refuses to start without it — no fallback secret | generate with `openssl rand -base64 48` |
| `JWT_EXPIRES_IN` | Optional token lifetime, defaults to `30d` | `30d` |
| `CORS_ORIGINS` | Optional, comma-separated browser origins allowed via CORS | unset = same-origin only |

---

## Troubleshooting

**MongoDB connection fails:**
- Check connection string format
- Whitelist your IP in MongoDB Atlas
- Verify username/password

**App doesn't start:**
- Check `npm run build` completes successfully
- Verify all environment variables are set
- Check logs: `heroku logs --tail` (for Heroku)

**Quiz questions not loading:**
- Confirm quizzes exist in the `Quiz` MongoDB collection (not flat JSON files)
- Check the MongoDB connection and permissions

---

## Support

For issues or questions:
1. Check application logs
2. Verify environment configuration
3. Test locally first before deploying

---

## Quick Deploy Commands

```bash
# Build Angular app
npm run build

# Install server dependencies
cd server && npm install && cd ..

# Start server
npm run server

# Or combined (development)
npm run dev
```
