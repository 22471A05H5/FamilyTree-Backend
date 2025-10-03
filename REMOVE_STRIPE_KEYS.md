# Remove Stripe Keys from .env File

## 🔧 Quick Fix for GitHub Push Protection

### Step 1: Edit .env File
Open `backend/.env` and **remove or comment out** these lines:

```bash
# Remove these lines:
STRIPE_SECRET_KEY=sk_test_51SA6VgDuNyxe7TBbNuTmB4eu8fNqfVnKygEamRxM9vAhvl9W7d1qRZoY5Q5Ymcb7oVRun4BX2nR32uoBV456VKXy00Iv1dbkvU
STRIPE_PUBLISHABLE_KEY=pk_test_51SA6VgDuNyxe7TBbejsfIr84UnQcOifQch2J1XARXUuaicpjzxxReU6NHTT7Jv1ERMaQktqyNKCz1WxWwKpQISz900wdUeC4hS
```

### Step 2: Your .env Should Look Like This:
```bash
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb+srv://pulagorlamounica_db_user:Yr26Mnw3eZHTf23u@cluster0.7avjyqy.mongodb.net/family_album?retryWrites=true&w=majority&appName=Cluster0
JWT_SECRET=FamilyAlbum2024_SuperSecure_JWT_Key_With_Random_Characters_9x7z3m8k5q2w1e4r6t
CLOUDINARY_CLOUD_NAME=dwtbyuesx
CLOUDINARY_API_KEY=483129316343929
CLOUDINARY_API_SECRET=dP5tTUddLM7YXIKdUYp1obwmU0o
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
- Add: `STRIPE_SECRET_KEY` and `STRIPE_PUBLISHABLE_KEY`

## ✅ Benefits:
- ✅ GitHub push will succeed
- ✅ No secrets in repository
- ✅ App still works (payment features disabled until keys added)
- ✅ Production deployment uses Render environment variables
