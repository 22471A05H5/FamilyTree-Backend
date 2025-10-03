# Environment Variables Setup

## 📋 Required Environment Variables

Copy `.env.example` to `.env` and fill in your actual values:

```bash
cp .env.example .env
```

### Database
- `MONGO_URI`: Your MongoDB Atlas connection string
- `NODE_ENV`: Set to `development` for local, `production` for deployment

### Authentication
- `JWT_SECRET`: A long, random string for JWT token signing (64+ characters recommended)

### File Storage (Cloudinary)
- `CLOUDINARY_CLOUD_NAME`: Your Cloudinary cloud name
- `CLOUDINARY_API_KEY`: Your Cloudinary API key
- `CLOUDINARY_API_SECRET`: Your Cloudinary API secret

### Payments (Stripe)
- `STRIPE_SECRET_KEY`: Your Stripe secret key (test or live)
- `STRIPE_PUBLISHABLE_KEY`: Your Stripe publishable key (test or live)

### Frontend
- `FRONTEND_URL`: URL of your frontend application

## 🔐 Security Notes

- Never commit `.env` files to version control
- Use test keys for development
- Use live keys only in production
- Keep secrets secure and rotate them regularly

## 🚀 For Render Deployment

Add these environment variables in your Render dashboard:
- Go to your service settings
- Add each variable in the Environment section
- Use production values for live deployment
