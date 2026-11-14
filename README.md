# Event Registration Management System

A clean, database-driven dashboard for managing college event registrations. The app combines a responsive vanilla JavaScript frontend with an Express REST API and MongoDB, keeping search, filtering, sorting, validation, and CRUD operations on the server.

## Highlights

- Add, view, edit, and delete registrations
- Search by participant name, registration ID, or participant/event name
- Filter by category, payment status, date range, and fee comparisons
- Combine MongoDB operators such as `$and`, `$or`, `$in`, `$ne`, `$gt`, `$lt`, `$gte`, and `$lte`
- Sort results by ID, name, event, date, fee, or creation time
- View the generated MongoDB query directly in the dashboard
- Automatic registration IDs such as `EM101`, `EM102`, and so on
- Mongoose validation and indexed fields for reliable, efficient queries
- Seed script with 16 sample registrations

## Built With

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Backend:** Node.js, Express.js
- **Database:** MongoDB with Mongoose
- **Utilities:** dotenv, CORS, Nodemon

## Quick Start

### Requirements

- Node.js and npm
- MongoDB Community Server running locally or a MongoDB connection string

### 1. Install dependencies

```bash
npm install
```

### 2. Configure the environment

Create a `.env` file in the project root:

```env
MONGO_URI=mongodb://127.0.0.1:27017/event_registration
PORT=3000
```

### 3. Add sample data (optional)

```bash
npm run seed
```

> The seed command clears the existing registrations before inserting the sample dataset.

### 4. Start the application

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000).

For development with automatic restarts:

```bash
npm run dev
```

On Windows, `run.bat` can start MongoDB, launch the browser, and run the server in one step.

## API

All endpoints are prefixed with `/api/registrations`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/` | List, search, filter, and sort registrations |
| `GET` | `/stats/summary` | Return totals, fee statistics, and counts by status/category |
| `GET` | `/:id` | Get one registration |
| `POST` | `/` | Create a registration |
| `PUT` | `/:id` | Update a registration |
| `DELETE` | `/:id` | Delete a registration |

Example:

```http
GET /api/registrations?eventCategory=Workshop&paymentStatus=Pending&feeGte=300&sortBy=fee&sortOrder=desc
```

The list endpoint returns the matching records, result count, validated sort settings, and the MongoDB query built by the server.

## Registration Fields

| Field | Description |
| --- | --- |
| `registrationId` | Automatically generated identifier, such as `EM101` |
| `participantName` | Participant's full name |
| `eventName` | Name of the event |
| `eventCategory` | Technical, Cultural, Sports, Academic, Workshop, Seminar, or Other |
| `registrationDate` | Date of registration |
| `email` | Valid participant email |
| `phone` | Participant phone number |
| `fee` | Non-negative registration fee |
| `paymentStatus` | Paid, Pending, or Failed |

## Project Structure

```text
.
├── config/
│   └── db.js                 # MongoDB connection
├── models/
│   └── Registration.js       # Schema, validation, and indexes
├── routes/
│   └── registrations.js      # REST API and query builder
├── public/
│   ├── css/style.css         # UI styles
│   ├── js/app.js             # Frontend behavior and API client
│   └── index.html            # Dashboard markup
├── seed.js                   # Sample data loader
├── server.js                 # Express entry point
├── run.bat                   # Windows launcher
└── package.json
```

## Design Note

Filtering and sorting are performed by MongoDB through the Express backend rather than by filtering a complete dataset in the browser. This keeps the frontend lightweight and demonstrates practical server-side database querying.

## License

This project is intended for educational and academic use.
