# 🚀 Deployment Instructions

## 📋 Prerequisites
1. **GitHub Repository**: Code is already pushed ✅
2. **Netlify Account**: Sign up at netlify.com
3. **Render Account**: Sign up at render.com (for backend)

## 🔧 Step 1: Deploy Backend to Render

### 1.1 Create New Web Service
1. Go to [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Select the repository: `MUKUL-PRASAD-SIGH/Hackathon-Dashboard`

### 1.2 Configure Backend Service
```
Name: hackathon-dashboard-backend
Environment: Node
Region: Oregon (US West)
Branch: main
Root Directory: server
Build Command: npm install
Start Command: npm start
```

### 1.3 Add Environment Variables
```
NODE_ENV=production
MONGODB_URI=mongodb+srv://hacktrack-user:mukulinblr%23123@cluster0.heduy1t.mongodb.net/hackathon-dashboard?retryWrites=true&w=majority&appName=Cluster0
GMAIL_USER=vol670668@gmail.com
GMAIL_APP_PASSWORD=uwgfpkdwbjnbrngv
PORT=10000
```

### 1.4 Deploy Backend
- Click "Create Web Service"
- Wait for deployment (5-10 minutes)
- Note the URL: `https://hackathon-dashboard-backend.onrender.com`

## 🌐 Step 2: Deploy Frontend to Netlify

### 2.1 Create New Site
1. Go to [netlify.com](https://netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect to GitHub
4. Select repository: `MUKUL-PRASAD-SIGH/Hackathon-Dashboard`

### 2.2 Configure Build Settings
```
Base directory: (leave empty)
Build command: npm run build
Publish directory: build
```

### 2.3 Add Environment Variables
Go to Site Settings → Environment Variables:
```
REACT_APP_API_URL=https://hackathon-dashboard-backend.onrender.com
NODE_ENV=production
```

### 2.4 Deploy Frontend
- Click "Deploy site"
- Wait for build (3-5 minutes)
- Get your live URL: `https://amazing-name-123456.netlify.app`

## ✅ Step 3: Test Deployment

### 3.1 Test Backend
Visit: `https://hackathon-dashboard-backend.onrender.com/health`
Should return: `{"status":"healthy",...}`

### 3.2 Test Frontend
1. Visit your Netlify URL
2. Try registration with OTP
3. Login and add hackathon
4. Verify data persistence

## 🔧 Step 4: Custom Domain (Optional)

### 4.1 For Netlify
1. Go to Domain Settings
2. Add custom domain
3. Configure DNS records

### 4.2 Update CORS
Update server CORS settings to include your domain:
```javascript
origin: ['https://yourdomain.com', 'https://amazing-name-123456.netlify.app']
```

## 🚨 Troubleshooting

### Backend Issues
- Check Render logs for errors
- Verify environment variables
- Test MongoDB connection

### Frontend Issues
- Check browser console for API errors
- Verify environment variables in Netlify
- Check network tab for failed requests

### CORS Issues
- Add your Netlify domain to backend CORS
- Redeploy backend after CORS update

## 📱 Final URLs
- **Frontend**: `https://your-site.netlify.app`
- **Backend**: `https://hackathon-dashboard-backend.onrender.com`
- **API Health**: `https://hackathon-dashboard-backend.onrender.com/health`

## 🎉 Success!
Your Hackathon Dashboard is now live and accessible worldwide! 🌍