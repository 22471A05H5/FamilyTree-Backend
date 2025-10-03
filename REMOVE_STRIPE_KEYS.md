# Remove Stripe Keys from .env File

## 🔧 Quick Fix for GitHub Push Protection

### Step 1: Edit .env File
Open `backend/.env` and **remove or comment out** the Stripe key lines:

```bash
# Remove the STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY lines
```

### Step 2: Your .env Should Look Like This:
```bash
NODE_ENV=development
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_jwt_secret
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
FRONTEND_URL=http://localhost:3000
```

### Step 3: Push to GitHub
```bash
git add .
git commit -m "Remove Stripe keys from environment"
git push origin main
```

### Step 4: For Render Deployment
Add Stripe keys directly in Render Dashboard:
- Go to your service → Environment
- Add your Stripe keys as environment variables

## ✅ Benefits:
- ✅ GitHub push will succeed
- ✅ No secrets in repository
- ✅ App still works (payment features disabled until keys added)
- ✅ Production deployment uses Render environment variables
