export function buildOpenApiSpec(baseUrl = 'http://localhost:3001') {
  return {
    openapi: '3.0.3',
    info: {
      title: 'Smart Invoice API',
      version: '1.0.0',
      description: 'Conta-style invoicing API foundation with auth, clients, invoices, reports, and settings.'
    },
    servers: [{ url: baseUrl }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [{ bearerAuth: [] }],
    paths: {
      '/api/auth/login': { post: { summary: 'Login with email and password' } },
      '/api/auth/refresh': { post: { summary: 'Refresh access token' } },
      '/api/company/profile': { get: { summary: 'Get company profile' }, put: { summary: 'Update company profile' } },
      '/api/clients': { get: { summary: 'List clients' }, post: { summary: 'Create client' } },
      '/api/invoices': { get: { summary: 'List invoices' }, post: { summary: 'Create invoice/quote/credit note' } },
      '/api/invoices/{id}/send': { post: { summary: 'Send invoice email' } },
      '/api/reports/revenue-by-month': { get: { summary: 'Monthly revenue totals' } },
      '/api/reports/outstanding': { get: { summary: 'Outstanding invoices' } },
      '/api/reports/top-clients': { get: { summary: 'Top clients by paid revenue' } }
    }
  };
}
