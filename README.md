# Notion Media Uploader

A full-stack application for uploading images, videos, and URLs to your Notion database.

## Features

- 📸 Upload images to Notion
- 🎥 Upload videos to Notion
- 🔗 Add URL bookmarks to Notion
- ✨ Modern, responsive UI with Tailwind CSS
- 🚀 Real-time server status checking
- 📝 Add titles and captions to uploads

## Project Structure

```
NotionApp/
├── server.js           # Express backend server
├── package.json        # Backend dependencies
├── .env.example        # Environment variables template
└── client/            # React frontend
    ├── src/
    │   ├── App.js
    │   ├── NotionUploader.js
    │   └── index.js
    └── package.json    # Frontend dependencies
```

## Setup Instructions

### 1. Backend Setup

1. Install backend dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

3. Add your Notion credentials to `.env`:
```
NOTION_API_KEY=your_notion_integration_token_here
NOTION_DATABASE_ID=your_database_id_here
PORT=3001
```

4. Start the backend server:
```bash
npm start
```

The backend will run on `http://localhost:3001`

### 2. Frontend Setup

1. Navigate to the client directory:
```bash
cd client
```

2. Install frontend dependencies:
```bash
npm install
```

3. Install Tailwind CSS:
```bash
npm install -D tailwindcss postcss autoprefixer
```

4. Start the frontend development server:
```bash
npm start
```

The frontend will run on `http://localhost:3000`

## Getting Notion API Credentials

### 1. Create a Notion Integration

1. Go to https://www.notion.so/my-integrations
2. Click "+ New integration"
3. Give it a name (e.g., "Media Uploader")
4. Select the workspace
5. Copy the "Internal Integration Token" - this is your `NOTION_API_KEY`

### 2. Create a Notion Database

1. Create a new page in Notion
2. Add a database (inline or full-page)
3. Make sure it has a "Name" property (title type)
4. Click the "..." menu → "Add connections" → Select your integration

### 3. Get Database ID

From the database URL: `https://notion.so/workspace/{database_id}?v=...`
Copy the `{database_id}` part - this is your `NOTION_DATABASE_ID`

## Usage

1. Ensure both backend (port 3001) and frontend (port 3000) are running
2. Open `http://localhost:3000` in your browser
3. Select the type of content you want to upload (Image/Video/URL)
4. Fill in the required fields
5. Click upload/add button
6. Check your Notion database for the new page!

## API Endpoints

### Backend Server

- `GET /api/health` - Health check endpoint
- `POST /api/upload` - Upload image or video file
- `POST /api/add-url` - Add URL bookmark

## Requirements

- Node.js 14+ 
- npm or yarn
- Notion account with API access
- Modern web browser

## File Size Limits

- Maximum file size: 20MB
- Supported formats: All image and video types

## Troubleshooting

- **Server offline**: Make sure the backend is running on port 3001
- **Upload fails**: Check that your Notion integration has access to the database
- **Database not found**: Verify your `NOTION_DATABASE_ID` is correct
- **Authentication error**: Verify your `NOTION_API_KEY` is correct

## License

ISC