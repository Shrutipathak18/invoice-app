# Smart Invoice Generator

A modern web application for creating, editing, and managing invoices with support for document template uploads.

## Features

### 📄 Document Template Support
- **Upload Templates**: Support for PDF, DOC, and DOCX files
- **Data Extraction**: Automatically extract invoice data from uploaded templates
- **Template Preservation**: Maintain the structure and layout of your original templates
- **Edit & Customize**: Modify extracted data in a user-friendly interface

### ✏️ Invoice Editing
- **Real-time Editing**: Edit all invoice fields with live preview
- **Auto-calculation**: Automatic calculation of totals, taxes, and amounts
- **Item Management**: Add, remove, and edit invoice line items
- **Data Validation**: Built-in validation for invoice data

### 📊 Export Options
- **PDF Export**: Generate professional PDF invoices
- **Template-based Generation**: Export using your original template structure
- **Multiple Formats**: Support for various document formats

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd invoice
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Start the API server:
```bash
npm run server
```

5. Open your browser and navigate to `http://localhost:5173`

## Conta-Style Backend API

This project now includes a backend foundation in `server.js` + `backend/` with:

- JWT access tokens + refresh token rotation
- Role-based access (`admin`, `employee`)
- Company profile (tax, contact, bank details, logo/signature upload)
- Client CRUD + tags + CSV import/export
- Invoice/quote/credit-note APIs with numbering and status workflow
- Send invoice email events + shareable public invoice links
- Reports endpoints (monthly revenue, outstanding, top clients)
- Settings (currency, exchange rates, date/number format, tax, numbering)
- OpenAPI JSON at `/api/docs/openapi.json`
- Logging to `logs/app.log` and `logs/error.log`
- In-memory background queue for bulk invoice send

### Default Admin Login

- Email: `owner@example.com`
- Password: `admin123`

### Main API Prefixes

- Auth: `/api/auth/*`
- Company: `/api/company/*`
- Clients: `/api/clients/*`
- Invoices: `/api/invoices/*`
- Reports: `/api/reports/*`
- Settings: `/api/settings/*`
- Platform docs/files/jobs: `/api/*`

## Usage

### Upload Document Template
1. Click "Choose Template" or drag and drop your document
2. Supported formats: PDF, DOC, DOCX
3. The system will automatically extract invoice data

### Edit Invoice Data
1. Review the extracted data
2. Modify any fields as needed
3. Add or remove invoice items
4. Preview changes in real-time

### Export as PDF
1. Click "Preview PDF" to see the final result
2. Click "Download PDF" to save the invoice
3. The exported PDF maintains your template structure

## Technology Stack

- **Frontend**: React 18 with Vite
- **Styling**: Tailwind CSS
- **PDF Processing**: jsPDF, pdf-lib, pdfjs-dist
- **Document Processing**: mammoth.js (for DOC/DOCX)
- **UI Components**: Lucide React icons

## File Structure

```
src/
├── components/
│   ├── DocumentUploader.jsx    # File upload component
│   ├── InvoiceEditor.jsx       # Invoice editing interface
│   └── InvoicePreview.jsx      # PDF preview component
├── utils/
│   ├── documentUtils.js        # Document processing utilities
│   └── pdfUtils.js            # PDF generation utilities
└── App.jsx                    # Main application component
```

## Supported File Formats

| Format | Extension | Description |
|--------|-----------|-------------|
| PDF    | .pdf      | Portable Document Format |
| Word   | .doc      | Microsoft Word Document |
| Word   | .docx     | Microsoft Word Document (XML) |

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Adding New Features

1. **Document Processing**: Extend `documentUtils.js` for new file formats
2. **PDF Generation**: Modify `pdfUtils.js` for custom PDF layouts
3. **UI Components**: Add new components in the `components/` directory

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License. 
