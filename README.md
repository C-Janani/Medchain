# MedChain-RX 💊
### Blockchain-Based Medical Prescription Management System

MedChain-RX is a secure digital healthcare prescription management platform designed to improve the creation, storage, verification, and management of medical prescriptions using blockchain technology.

The platform connects doctors, patients, pharmacies, and administrators through a centralized web application with blockchain-based prescription verification, helping improve transparency, traceability, and security in prescription management.

## 🚀 Features

- **Role-Based Authentication:** Separate access for Doctors, Patients, Pharmacies, and Administrators.
- **Digital Prescription Management:** Create, manage, view, and verify digital medical prescriptions.
- **Blockchain Integration:** Maintain tamper-evident prescription records and transaction history.
- **Prescription Verification:** Verify prescription authenticity and track its status.
- **Patient Management:** Manage patient information and associated prescriptions.
- **Pharmacy Access:** Allow pharmacies to access and validate authorized prescriptions.
- **Admin Dashboard:** Manage platform users and monitor system activities.
- **Secure Authentication:** JWT-based authentication and protected application routes.
- **Public Demo:** Explore the application's demo functionality.

## 🛠️ Technology Stack

| Category | Technologies |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose |
| Authentication | JSON Web Tokens (JWT) |
| Blockchain | Blockchain-based prescription record management |
| Deployment | Render |
| Version Control | Git, GitHub |

## 👥 User Roles

| Role | Responsibilities |
|---|---|
| Doctor | Create and manage patient prescriptions |
| Patient | View personal prescription records |
| Pharmacy | Verify and process authorized prescriptions |
| Admin | Manage users and monitor platform activities |

## ⚙️ Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/C-Janani/Medchain.git
```

### 2. Navigate to the Project Directory

```bash
cd Medchain
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create a `.env` file in the project root directory.

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_jwt_secret
NODE_ENV=development
```

Replace the placeholder values with your actual configuration.

**Important:** Never upload your `.env` file, database credentials, or secret keys to GitHub.

### 5. Start the Application

```bash
npm run start
```

Open your browser and visit:

```text
http://localhost:5000
```

## ☁️ Deployment

MedChain-RX is configured for deployment using Render.

**Live Application:** https://medchain-rx.onrender.com

Deployment requirements:

1. Push the project to GitHub.
2. Connect the GitHub repository to Render.
3. Select Node.js as the runtime.
4. Set the build command to `npm install`.
5. Set the start command to `npm run start`.
6. Configure the required environment variables in Render.
7. Deploy the application.

## 🔐 Security

- JWT-based authentication.
- Role-based access control.
- Environment-based secret management.
- Protected API endpoints.
- Blockchain-based prescription record verification.

## 🎯 Project Objective

The primary objective of MedChain-RX is to modernize medical prescription management by introducing a secure, transparent, and traceable digital system.

By combining web technologies, database management, authentication, and blockchain concepts, the platform aims to reduce prescription manipulation and improve coordination between healthcare stakeholders.

## 👩‍💻 Developer

**Janani C**

B.Tech – Computer Science and Engineering

GitHub: [C-Janani](https://github.com/C-Janani)

Project Repository: [MedChain-RX](https://github.com/C-Janani/Medchain)

---

⭐ If you find this project interesting, consider giving the repository a star!

**MedChain-RX – Building Trust in Digital Healthcare Through Blockchain Technology.**
