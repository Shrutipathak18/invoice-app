# OnlyOffice Integration Setup Guide

This guide will help you set up the OnlyOffice document editor integration for your invoice editing website.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start OnlyOffice Document Server (Docker)
```bash
docker run -i -t -d -p 8080:80 onlyoffice/documentserver
```

### 3. Start the File Server
```bash
npm run server
```

### 4. Start the React App
```bash
npm run dev
```

## 📋 What Each Component Does

### **OnlyOffice Document Server (Docker)**
- Runs on `http://localhost:8080`
- Handles document rendering and editing
- Provides the web-based editor interface
- Supports DOCX, DOC, PDF, and other formats

### **File Server (Express)**
- Runs on `http://localhost:3001`
- Handles file uploads from the React app
- Serves uploaded files to OnlyOffice
- Provides callback endpoints for save operations

### **React App**
- Runs on `http://localhost:5173`
- Provides the user interface
- Integrates with OnlyOffice via iframe
- Handles file uploads and editor initialization

## 🔧 Configuration

### **OnlyOffice Server URL**
The OnlyOffice server URL is configured in `src/components/OnlyOfficeEditor.jsx`:
```javascript
const ONLYOFFICE_SERVER_URL = 'http://localhost:8080'
```

### **File Server URL**
The file server URL is configured in the same file:
```javascript
const response = await fetch('http://localhost:3001/upload', {
  method: 'POST',
  body: formData
})
```

## 🎯 How It Works

1. **User uploads a DOCX/DOC file** through the React app
2. **File is uploaded** to the Express server (`localhost:3001`)
3. **File URL is generated** and passed to OnlyOffice
4. **OnlyOffice loads the document** in an iframe within the React app
5. **User edits the document** visually (like in Word/WPS)
6. **Document can be saved** as DOCX or exported as PDF

## 🐛 Troubleshooting

### **OnlyOffice Server Not Running**
- Check if Docker is running
- Verify the container is started: `docker ps`
- Check logs: `docker logs <container_id>`

### **File Upload Issues**
- Ensure the Express server is running on port 3001
- Check that the `uploads` directory exists
- Verify CORS settings in `server.js`

### **Editor Not Loading**
- Check browser console for errors
- Verify OnlyOffice script is loading from `localhost:8080`
- Ensure file URLs are accessible

## 📁 File Structure

```
invoice/
├── src/
│   ├── components/
│   │   ├── OnlyOfficeEditor.jsx    # OnlyOffice integration
│   │   ├── DocumentUploader.jsx    # File upload component
│   │   └── ...
│   └── App.jsx                     # Main app with editing modes
├── server.js                        # Express file server
├── uploads/                         # Uploaded files (auto-created)
└── package.json
```

## 🔄 Development Workflow

1. **Start all services:**
   ```bash
   # Terminal 1: OnlyOffice server
   docker run -i -t -d -p 8080:80 onlyoffice/documentserver
   
   # Terminal 2: File server
   npm run server
   
   # Terminal 3: React app
   npm run dev
   ```

2. **Test the integration:**
   - Open `http://localhost:5173`
   - Choose "Visual Document Editor"
   - Upload a DOCX file
   - Edit the document in the browser

## 🚀 Production Deployment

For production, you'll need to:
1. Deploy OnlyOffice Document Server on a server
2. Deploy the Express file server
3. Update URLs in the React app
4. Configure proper CORS settings
5. Set up file storage (cloud storage recommended)

## 📚 Additional Resources

- [OnlyOffice Documentation](https://helpcenter.onlyoffice.com/)
- [OnlyOffice Docker Setup](https://github.com/ONLYOFFICE/Docker-DocumentServer)
- [Express.js File Upload](https://expressjs.com/en/resources/middleware/multer.html) 