# Quick Deployment Guide - Render.com (FREE)

## Why Render?
- ✅ Free tier available (no credit card required)
- ✅ Easy setup
- ✅ Automatic deployments from GitHub
- ✅ Free MongoDB through MongoDB Atlas

---

## Step-by-Step Deployment

### 1. Create MongoDB Atlas Account (FREE)

1. Go to https://www.mongodb.com/cloud/atlas/register
2. Sign up for free account
3. Create a free cluster (M0 tier)
4. Click "Connect" → "Connect your application"
5. Copy the connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/userDB`)
6. Save this - you'll need it later!

### 2. Push Code to GitHub

```bash
cd /Users/alphathiam/Documents/GitHub/quizzes
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 3. Deploy on Render.com

1. Go to https://render.com
2. Sign up/login (use GitHub account)
3. Click "New +" → "Web Service"
4. Connect your GitHub repository `alpha-tronex/quizzes`
5. Configure settings:
   - **Name**: quiz-master-alpha
   - **Build Command**: `npm install && npm run build && cd server && npm install`
   - **Start Command**: `node server/server.js`
   - **Environment**: Node
   
6. Add environment variables:
   - Click "Advanced" → "Add Environment Variable"
   - Key: `MONGODB_URI`
   - Value: (paste your MongoDB Atlas connection string)
   - Add another:
   - Key: `NODE_ENV`
   - Value: `production`

7. Click "Create Web Service"
8. Wait 5-10 minutes for deployment
9. Your app will be live at: `https://quiz-master-alpha.onrender.com`

---

## Alternative: Heroku (Requires Credit Card Verification)

If you verify your Heroku account at https://heroku.com/verify, you can deploy:

```bash
heroku create quiz-master-alpha
heroku config:set MONGODB_URI="your-mongodb-connection-string"
heroku config:set NODE_ENV=production
git push heroku main
heroku open
```

---

## After Deployment

1. Test the app:
   - Register a new user
   - Take a quiz
   - Check quiz history

2. Monitor logs:
   - Render: Check dashboard logs
   - Heroku: `heroku logs --tail`

---

## Troubleshooting

**Can't connect to database?**
- Check MongoDB Atlas connection string
- Whitelist all IPs (0.0.0.0/0) in MongoDB Atlas Network Access

**App won't start?**
- Check environment variables are set
- Review deployment logs

**Need help?**
- Render docs: https://render.com/docs
- MongoDB Atlas: https://docs.atlas.mongodb.com/
