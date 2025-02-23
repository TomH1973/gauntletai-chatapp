# Chat App with AI Integration

A real-time chat application with AI responses and MongoDB persistence.

## Features

- User authentication with JWT
- Real-time messaging with Socket.IO
- Message persistence with MongoDB
- AI response generation
- Modern UI with Tailwind CSS

## Prerequisites

- Node.js (v14 or later)
- MongoDB (v4.4 or later)
- npm or yarn

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd chatapp
```

2. Install dependencies:
```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ..
npm install
```

3. Configure environment variables:
- Copy `.env.example` to `.env`
- Update the values as needed

4. Start MongoDB:
```bash
# Using Docker
docker run -d -p 27017:27017 --name chatapp-mongo mongo:latest

# Or use your local MongoDB installation
```

5. Start the server:
```bash
cd server
npm start
```

6. Start the client (in a new terminal):
```bash
npm start
```

The application will be available at http://localhost:3000

## Development

- Server runs on port 3001
- Client runs on port 3000
- MongoDB runs on port 27017

## API Endpoints

### Authentication
- POST `/api/auth/register` - Register a new user
- POST `/api/auth/login` - Login user

### Messages
- GET `/api/messages` - Get recent messages
- POST `/api/messages` - Create a new message

## WebSocket Events

- `message` - Send/receive chat messages
- `error` - Error notifications

## Environment Variables

### Server
- `PORT` - Server port (default: 3001)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret

### Client
- `REACT_APP_API_URL` - API base URL

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT 