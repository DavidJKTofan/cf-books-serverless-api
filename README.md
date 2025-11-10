# Books Serverless API

A simple serverless REST API built with [Cloudflare Workers](https://workers.cloudflare.com/) and [D1 SQLite database](https://developers.cloudflare.com/d1/) for managing a book collection.

## Features

- **Full CRUD operations** for books with input validation
- **Pagination and filtering** with query parameters
- **Full-text search** across all book fields
- **Rate limiting** using Cloudflare [Workers Rate Limiting API](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
- **Comprehensive error handling** with structured logging
- **Request validation** including content-type and size checks
- **Response caching** for optimized performance
- **CORS support** for cross-origin requests
- **Health monitoring** and statistics endpoints

## Setup

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/DavidJKTofan/cf-books-serverless-api)

### 1. Create Cloudflare Workers Project

```bash
npm create cloudflare@latest -- books-serverless-api
```

Note: This project uses the new `json` [wrangler configuration file](https://developers.cloudflare.com/workers/wrangler/configuration/).

### 2. Create D1 Database

```bash
npx wrangler d1 create prod-d1-books-serverless-api
```

Add the database binding to your `wrangler.json`:

```json
{
	"d1_databases": [
		{
			"binding": "DB",
			"database_name": "prod-d1-books-serverless-api",
			"database_id": "<your-database-id>"
		}
	]
}
```

### 3. Apply Database Schema

```bash
npx wrangler d1 execute prod-d1-books-serverless-api --file=database_schema_01.sql --remote
```

See [database_schema_01.sql](database_schema_01.sql) and [OpenAPI Specification Schema](openapi-spec-schema.yaml).

### 4. Configure Rate Limiting (Optional)

Add a rate limiting binding to your `wrangler.json`:

```json
{
	"rate_limit": [
		{
			"binding": "RATE_LIMITER",
			"simple": {
				"limit": 100,
				"period": 60
			}
		}
	]
}
```

This allows 100 requests per minute. Adjust as needed for your use case.

## Database Schema

```sql
CREATE TABLE books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    year INTEGER,
    isbn TEXT,
    genre TEXT,
    description TEXT
);
```

## API Endpoints

### Health Check

```http
GET /api/health
```

Returns the API's operational status and timestamp.

**Response:**

```json
{
	"status": "healthy",
	"timestamp": "2025-11-10T12:00:00.000Z"
}
```

---

### Statistics

```http
GET /api/stats
```

Returns overall statistics including total books, genre breakdown, and publication year range.

**Response:**

```json
{
	"totalBooks": 42,
	"genreBreakdown": [
		{ "genre": "Fiction", "count": 15 },
		{ "genre": "Science Fiction", "count": 12 }
	],
	"yearRange": {
		"earliest": 1949,
		"latest": 2024
	}
}
```

---

### List Books

```http
GET /api/books
```

**Query Parameters:**

- `page` (optional): Page number, default: 1
- `limit` (optional): Items per page, default: 10, max: 100
- `genre` (optional): Filter by genre
- `year` (optional): Filter by publication year

**Response:**

```json
{
	"data": [
		{
			"id": 1,
			"title": "1984",
			"author": "George Orwell",
			"year": 1949,
			"isbn": "9780451524935",
			"genre": "Fiction",
			"description": "A dystopian social science fiction novel"
		}
	],
	"pagination": {
		"total": 42,
		"page": 1,
		"limit": 10,
		"pages": 5
	}
}
```

---

### Create Book

```http
POST /api/books
Content-Type: application/json
```

**Required Fields:**

- `title` (string, max 500 chars)
- `author` (string, max 200 chars)

**Optional Fields:**

- `year` (number, 0 to current year + 10)
- `isbn` (string, valid ISBN-10 or ISBN-13 format)
- `genre` (string, max 100 chars)
- `description` (string, max 5000 chars)

**Request Body:**

```json
{
	"title": "Neuromancer",
	"author": "William Gibson",
	"year": 1984,
	"genre": "Science Fiction",
	"isbn": "9780441569595",
	"description": "A groundbreaking cyberpunk novel"
}
```

**Response:** Returns the created book with generated ID (HTTP 201).

---

### Get Single Book

```http
GET /api/books/:id
```

Returns a single book by ID.

---

### Update Book

```http
PUT /api/books/:id
Content-Type: application/json
```

**Allowed Fields:**

- `title`, `author`, `year`, `isbn`, `genre`, `description`

**Request Body:**

```json
{
	"genre": "Classic Literature",
	"description": "Updated description"
}
```

**Response:** Returns the updated book.

---

### Delete Book

```http
DELETE /api/books/:id
```

Deletes a book by ID. Returns HTTP 204 on success.

---

### Search Books

```http
GET /api/books/search?q=query
```

Searches across title, author, genre, ISBN, year, and description fields.

**Query Parameters:**

- `?q=` (required): Search query, max 200 chars

**Response:**

```json
{
  "query": "fiction",
  "results": [...],
  "count": 8
}
```

## Example Requests

### List Books with Filtering

```bash
curl "https://api.dlsdemo.com/api/books?page=1&limit=5&genre=Literary%20Fiction"
```

### Search Books

```bash
curl "https://api.dlsdemo.com/api/books/search?q=cyberpunk"
```

### Create New Book

```bash
curl -X POST "https://api.dlsdemo.com/api/books" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Neuromancer",
    "author": "William Gibson",
    "year": 1984,
    "genre": "Science Fiction",
    "isbn": "9780441569595",
    "description": "A groundbreaking cyberpunk novel about a washed-up computer hacker hired for one last job."
  }'
```

### Update Book

```bash
curl -X PUT "https://api.dlsdemo.com/api/books/1" \
  -H "Content-Type: application/json" \
  -d '{
    "genre": "Classic Literature"
  }'
```

### Delete Book

```bash
curl -X DELETE "https://api.dlsdemo.com/api/books/1"
```

## Error Handling

The API returns consistent error responses:

```json
{
	"error": "Error message description"
}
```

**HTTP Status Codes:**

- `400` - Bad Request (validation errors, invalid input)
- `404` - Not Found (book doesn't exist)
- `413` - Request Too Large (body exceeds 1MB)
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error
- `504` - Gateway Timeout (database query timeout)

## Security Features

- **Input Validation:** All user inputs are validated for type, length, and format
- **SQL Injection Prevention:** Uses parameterized queries ([D1 prepared statement methods](https://developers.cloudflare.com/d1/worker-api/prepared-statements/)) with proper field whitelisting
- **Rate Limiting:** Configurable per-IP rate limits via [Workers Binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
- **Request Size Limits:** Maximum 1MB request body size
- **Content-Type Validation:** Enforces `application/json` for POST/PUT requests
- **Query Timeouts:** 5-second timeout for database operations
- **Structured Logging:** Request IDs and comprehensive error logging for debugging

## Development

### Local Development

```bash
npm run dev
```

### Deploy to Cloudflare

```bash
npm run deploy
```

### View Logs

```bash
npx wrangler tail
```

## Performance Optimization

- **Response Caching:**

  - GET single book: 5 minutes cache, 10 minutes stale-while-revalidate
  - GET book list: 1 minute cache, 2 minutes stale-while-revalidate
  - Search results: 1 minute cache, 2 minutes stale-while-revalidate
  - Stats: 5 minutes cache, 10 minutes stale-while-revalidate

- **Database Indexing:** Consider adding indexes on frequently queried fields (genre, year) for better performance

## Limitations

- Maximum request body size: 1MB
- Maximum field lengths enforced (see Create Book section)
- Search queries limited to 200 characters
- Rate limiting (if configured): 100 requests per minute per IP

## Disclaimer

This is a demonstration project showcasing Cloudflare Workers and D1 database capabilities with a minimal demonstration of security features and best practices. While it implements comprehensive security measures, additional considerations (authentication, authorization, advanced monitoring) should be evaluated based on your specific production requirements.

Educational and demonstration purposes only.
