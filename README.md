# Expense Management System

A comprehensive expense management system built with the MERN stack, featuring multi-level approval workflows, OCR receipt processing, real-time currency conversion, and role-based access control.

## Features

### Core Features
- **Authentication & User Management**
  - Auto-create company and admin user on signup
  - Role-based access (Admin, Manager, Employee)
  - Manager-employee relationships

- **Expense Submission**
  - Submit expenses with multiple currencies
  - Automatic currency conversion to company base currency
  - OCR-powered receipt scanning
  - Support for expense line items
  - Category-based expense tracking

- **Advanced Approval Workflows**
  - Sequential approval chains
  - Percentage-based approvals
  - Specific approver rules
  - Hybrid approval combinations
  - Manager approval gates
  - Conditional approval flows based on amount thresholds

- **Analytics & Reporting**
  - Expense dashboards with real-time stats
  - Category-wise expense breakdown
  - Visual charts and graphs
  - Approval status tracking

### Additional Features
- **Real-time Currency Conversion**
  - Integration with live exchange rate APIs
  - Support for 150+ currencies
  - Automatic rate caching

- **OCR Receipt Processing**
  - Automatic data extraction from receipts
  - Extract amount, date, merchant name, and line items
  - Support for images and PDFs

- **Modern UI/UX**
  - Responsive design with TailwindCSS
  - Clean and intuitive interface
  - Mobile-friendly layout
  - Real-time toast notifications

## Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database (via Docker)
- **Mongoose** - ODM
- **JWT** - Authentication
- **Tesseract.js** - OCR processing
- **Multer** - File uploads
- **Axios** - HTTP client

### Frontend
- **React 18** - UI library
- **Vite** - Build tool
- **React Router v6** - Routing
- **TailwindCSS** - Styling
- **Lucide React** - Icons
- **Recharts** - Data visualization
- **React Hot Toast** - Notifications
- **Axios** - HTTP client

## Project Structure

```
expense-management-system/
├── backend/
│   ├── config/
│   │   └── database.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── expenseController.js
│   │   └── approvalRuleController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── errorHandler.js
│   ├── models/
│   │   ├── Company.js
│   │   ├── User.js
│   │   ├── Expense.js
│   │   └── ApprovalRule.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── expenseRoutes.js
│   │   └── approvalRuleRoutes.js
│   ├── utils/
│   │   ├── tokenGenerator.js
│   │   ├── currencyConverter.js
│   │   └── ocrProcessor.js
│   ├── .env
│   ├── package.json
│   └── server.js
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Layout.jsx
    │   │   └── PrivateRoute.jsx
    │   ├── context/
    │   │   └── AuthContext.jsx
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Register.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── Expenses.jsx
    │   │   ├── NewExpense.jsx
    │   │   ├── ExpenseDetail.jsx
    │   │   ├── PendingApprovals.jsx
    │   │   ├── Users.jsx
    │   │   ├── ApprovalRules.jsx
    │   │   └── Analytics.jsx
    │   ├── utils/
    │   │   └── axios.js
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── package.json
    ├── tailwind.config.js
    └── vite.config.js
```

## Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- Docker Desktop (for MongoDB)
- npm or yarn

### Step 1: Start MongoDB with Docker

```bash
# Pull and run MongoDB container
docker run -d -p 27017:27017 --name mongodb mongo:latest
```

### Step 2: Backend Setup

```bash
cd backend

# Install dependencies
npm install

# The .env file is already created with default values
# Update if needed for your environment

# Start the backend server
npm run dev
```

The backend server will run on `http://localhost:5000`

### Step 3: Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will run on `http://localhost:3000`

## 6-Hour Implementation Guide

### Hour 1: Environment & Backend Foundation (✓ Complete)
- [x] Project structure setup
- [x] MongoDB connection
- [x] Database models (Company, User, Expense, ApprovalRule)
- [x] Authentication middleware and utilities

### Hour 2: Backend API Development (✓ Complete)
- [x] Auth endpoints (login, register, me)
- [x] User management endpoints
- [x] Expense CRUD operations
- [x] Approval workflow logic

### Hour 3: Advanced Features Backend (✓ Complete)
- [x] Currency conversion integration
- [x] OCR receipt processing
- [x] Approval rules engine
- [x] File upload handling

### Hour 4: Frontend Foundation (✓ Complete)
- [x] React app setup with Vite
- [x] TailwindCSS configuration
- [x] Routing setup
- [x] Auth context and protected routes
- [x] Layout component

### Hour 5: Core UI Pages (✓ Complete)
- [x] Login/Register pages
- [x] Dashboard with stats
- [x] Expense list and detail views
- [x] New expense form with OCR
- [x] Approval management

### Hour 6: Admin Features & Polish (✓ Complete)
- [x] User management page
- [x] Approval rules configuration
- [x] Analytics dashboard
- [x] UI polish and responsive design
- [x] Error handling and notifications

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user and create company
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Users (Admin only)
- `GET /api/users` - Get all users in company
- `POST /api/users` - Create new user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `GET /api/users/managers` - Get all managers

### Expenses
- `GET /api/expenses` - Get expenses (filtered by role)
- `POST /api/expenses` - Create expense
- `GET /api/expenses/:id` - Get expense details
- `POST /api/expenses/upload-receipt` - Upload and process receipt
- `GET /api/expenses/pending-approvals` - Get pending approvals (Manager/Admin)
- `PUT /api/expenses/:id/approve` - Approve/reject expense

### Approval Rules (Admin only)
- `GET /api/approval-rules` - Get all rules
- `POST /api/approval-rules` - Create rule
- `PUT /api/approval-rules/:id` - Update rule
- `DELETE /api/approval-rules/:id` - Delete rule

## Usage Guide

### 1. First Time Setup
1. Register a new account (this creates a company and admin user)
2. Login with your credentials
3. You'll be redirected to the dashboard

### 2. For Admins
- **Add Users**: Go to Users → Add User (assign roles and managers)
- **Create Approval Rules**: Go to Approval Rules → Add Rule
- **View Analytics**: Access Analytics dashboard for insights
- **Manage Expenses**: Override approvals if needed

### 3. For Managers
- **Review Approvals**: Go to Pending Approvals
- **View Team Expenses**: Access expenses from your team
- **Approve/Reject**: Review expenses and take action

### 4. For Employees
- **Submit Expense**: Go to Submit Expense
- **Upload Receipt**: Use OCR to auto-fill expense details
- **Track Status**: View expense history and approval status

## Key Features Explained

### Approval Workflows

1. **Sequential Approval**: Expenses go through approvers in order
2. **Percentage-based**: Requires X% of approvers to approve
3. **Specific Approver**: Auto-approve if specific person approves
4. **Hybrid**: Combination of sequential + percentage/specific

### Currency Handling
- Select any currency when submitting expense
- Automatic conversion to company base currency
- Real-time exchange rates with caching
- Display both original and converted amounts

### OCR Receipt Processing
- Upload receipt image (JPG, PNG) or PDF
- Extracts: amount, date, merchant name, line items
- Auto-populates expense form
- Manual editing always available

## Environment Variables

### Backend (.env)
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/expense_management
JWT_SECRET=your_secret_key
JWT_EXPIRE=7d
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

## Security Features
- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- Request rate limiting
- Helmet.js security headers
- Input validation
- Protected API routes

## Future Enhancements
- Email notifications for approvals
- Bulk expense import
- Advanced reporting exports (PDF, Excel)
- Mobile app
- Expense policies and limits
- Mileage tracking
- Integration with accounting software
- Audit logs

## Troubleshooting

### MongoDB Connection Issues
```bash
# Check if MongoDB container is running
docker ps

# Restart MongoDB
docker restart mongodb
```

### Port Conflicts
- Backend default: 5000 (change in .env)
- Frontend default: 3000 (change in vite.config.js)

### Module Not Found Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## License
MIT

## Support
For issues and questions, please create an issue in the repository.
