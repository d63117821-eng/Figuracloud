# Figura Cloud Backend

Enterprise-grade management platform for Minecraft Figura mod with real-time monitoring, avatar management, and role-based access control.

## Features

- 🔐 **Authentication & Authorization**
  - JWT-based authentication
  - Role-based access control (User, Moderator, Admin, SuperAdmin)
  - Password reset functionality
  - Refresh token support

- 🎨 **Avatar Management**
  - Upload and manage Figura avatars (.lua files)
  - Thumbnail support
  - Categorization and tagging
  - Public/Private/Unlisted visibility
  - Like and download tracking
  - Search functionality

- 📊 **Real-time Monitoring**
  - System health checks
  - Prometheus metrics export
  - Performance monitoring
  - Activity logging
  - Database statistics

- 🛡️ **Security**
  - Helmet.js security headers
  - CORS protection
  - Rate limiting
  - NoSQL injection prevention
  - XSS protection
  - Input validation

- 📈 **Enterprise Features**
  - Comprehensive logging with Winston
  - Error handling
  - File upload with Multer
  - SHA-256 file hashing
  - Graceful shutdown

## Tech Stack

- **Runtime**: Node.js (>=18.0.0)
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Cache**: Redis (optional)
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: express-validator
- **File Upload**: Multer
- **Monitoring**: Prometheus (prom-client)
- **Logging**: Winston

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- MongoDB >= 6.0
- Redis (optional, for caching)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd figura-cloud-backend
```

2. Install dependencies:
```bash
npm install
```

3. Copy environment file and configure:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Server
NODE_ENV=development
PORT=3000

# Database
MONGODB_URI=mongodb://localhost:27017/figura-cloud

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d

# File Upload
MAX_FILE_SIZE=52428800
UPLOAD_PATH=./uploads
```

4. Start the server:
```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

The server will start on `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/logout` - Logout user
- `GET /api/v1/auth/me` - Get current user
- `PUT /api/v1/auth/me` - Update user profile
- `PUT /api/v1/auth/me/password` - Change password
- `POST /api/v1/auth/refresh-token` - Refresh JWT token
- `POST /api/v1/auth/forgot-password` - Request password reset
- `POST /api/v1/auth/reset-password` - Reset password

### Avatars
- `GET /api/v1/avatars` - Get all avatars (with pagination & filters)
- `POST /api/v1/avatars` - Create new avatar (requires auth)
- `GET /api/v1/avatars/:id` - Get avatar by ID
- `PUT /api/v1/avatars/:id` - Update avatar (owner/admin only)
- `DELETE /api/v1/avatars/:id` - Delete avatar (owner/admin only)
- `GET /api/v1/avatars/:id/download` - Download avatar
- `POST /api/v1/avatars/:id/like` - Like avatar
- `DELETE /api/v1/avatars/:id/like` - Unlike avatar
- `GET /api/v1/avatars/user/:userId` - Get user's avatars
- `GET /api/v1/avatars/featured` - Get featured avatars
- `GET /api/v1/avatars/search?q=query` - Search avatars

### Admin Avatar Routes
- `GET /api/v1/avatars/admin/pending` - Get pending avatars
- `PUT /api/v1/avatars/:id/status` - Update avatar status
- `POST /api/v1/avatars/:id/feature` - Toggle featured status

### Monitoring
- `GET /health` - Health check (public)
- `GET /api/v1/monitoring/metrics` - Prometheus metrics (public)
- `GET /api/v1/monitoring/status` - System status (public)
- `GET /api/v1/monitoring/dashboard` - Dashboard data (admin)
- `GET /api/v1/monitoring/users/active` - Active users (admin)
- `GET /api/v1/monitoring/performance` - Performance metrics (admin)
- `GET /api/v1/monitoring/errors` - Error logs (admin)
- `GET /api/v1/monitoring/database` - Database stats (admin)
- `GET /api/v1/monitoring/cache` - Cache stats (admin)

## Example Usage

### Register a User
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "SecurePass123",
    "minecraftUsername": "JohnDoe_MC"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123"
  }'
```

### Upload an Avatar
```bash
curl -X POST http://localhost:3000/api/v1/avatars \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "name=My Awesome Avatar" \
  -F "description=A cool avatar" \
  -F "category=anime" \
  -F "tags[]=cool" \
  -F "tags[]=figura" \
  -F "visibility=public" \
  -F "figuraVersion=0.8.0" \
  -F "luaScript=@path/to/avatar.lua" \
  -F "thumbnail=@path/to/thumbnail.png"
```

### Get All Avatars
```bash
curl "http://localhost:3000/api/v1/avatars?page=1&limit=20&sort=createdAt&order=desc"
```

### Health Check
```bash
curl http://localhost:3000/health
```

## Project Structure

```
figura-cloud-backend/
├── src/
│   ├── config/           # Configuration files
│   │   ├── index.js      # Main config
│   │   └── database.js   # Database connection
│   ├── controllers/      # Route controllers
│   │   ├── authController.js
│   │   ├── avatarController.js
│   │   └── monitoringController.js
│   ├── middleware/       # Custom middleware
│   │   ├── auth.js       # Authentication
│   │   ├── upload.js     # File upload
│   │   ├── rateLimiter.js
│   │   └── errorHandler.js
│   ├── models/           # Mongoose models
│   │   ├── User.js
│   │   ├── Avatar.js
│   │   ├── ActivityLog.js
│   │   └── ServerMetric.js
│   ├── routes/           # API routes
│   │   ├── auth.js
│   │   ├── avatars.js
│   │   └── monitoring.js
│   ├── utils/            # Utility functions
│   │   └── logger.js
│   ├── app.js            # Express app setup
│   └── index.js          # Entry point
├── uploads/              # Uploaded files
├── logs/                 # Log files
├── .env                  # Environment variables
├── .env.example          # Environment template
├── package.json
└── README.md
```

## Development

### Run Tests
```bash
npm test
npm run test:watch
```

### Linting
```bash
npm run lint
npm run lint:fix
```

### Format Code
```bash
npm run format
```

### Docker
```bash
# Build image
npm run docker:build

# Run container
npm run docker:run
```

## Monitoring

### Prometheus Metrics
Access metrics at `/api/v1/monitoring/metrics`:
```bash
curl http://localhost:3000/api/v1/monitoring/metrics
```

### Health Check
```bash
curl http://localhost:3000/health
```

## Security Considerations

- Always use HTTPS in production
- Keep JWT secrets secure and rotate regularly
- Implement proper CORS policies
- Use environment variables for sensitive data
- Regularly update dependencies
- Monitor rate limits and adjust as needed

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.

---

Built with ❤️ for the Minecraft Figura community
