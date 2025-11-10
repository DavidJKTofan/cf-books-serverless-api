// Error types for better handling
class ValidationError extends Error {
	constructor(message) {
		super(message);
		this.name = 'ValidationError';
		this.status = 400;
	}
}

class NotFoundError extends Error {
	constructor(message) {
		super(message);
		this.name = 'NotFoundError';
		this.status = 404;
	}
}

class RateLimitError extends Error {
	constructor(message) {
		super(message);
		this.name = 'RateLimitError';
		this.status = 429;
	}
}

const ROUTES = {
	HOME: new URLPattern({ pathname: '/' }),
	SEARCH: new URLPattern({ pathname: '/api/books/search' }),
	BOOKS_COLLECTION: new URLPattern({ pathname: '/api/books' }),
	SINGLE_BOOK: new URLPattern({ pathname: '/api/books/:id([0-9]+)' }), // Add numeric constraint
	STATS: new URLPattern({ pathname: '/api/stats' }),
	HEALTH: new URLPattern({ pathname: '/api/health' }),
};

// Allowed fields for updates
const ALLOWED_UPDATE_FIELDS = ['title', 'author', 'year', 'isbn', 'genre', 'description'];

// Landing page HTML
const getLandingPage = () => {
	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Books Serverless API</title>
  <style>
    /* === Reset & Base Styles === */
    *, *::before, *::after {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    html {
      scroll-behavior: smooth;
      font-size: 100%;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #e4e6eb;
      background: linear-gradient(135deg, #1a1b3a 0%, #27284f 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }

    /* === Container === */
    .container {
      width: 100%;
      max-width: 800px;
      background: #1f1f2e;
      border-radius: 1rem;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
      padding: 3rem;
      animation: fadeIn 0.6s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* === Typography === */
    h1 {
      font-size: 2.25rem;
      color: #9fa8ff;
      margin-bottom: 0.75rem;
      font-weight: 700;
      text-align: center;
    }

    .subtitle {
      font-size: 1.1rem;
      color: #b0b3c5;
      text-align: center;
      margin-bottom: 2rem;
    }

    .description {
      margin-bottom: 2rem;
      color: #c7c9d5;
      font-size: 1rem;
      text-align: center;
    }

    /* === Endpoints Section === */
    .endpoints {
      background: #2a2b45;
      border-radius: 0.75rem;
      padding: 1.5rem;
      margin-bottom: 2rem;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .endpoints h2 {
      font-size: 1.3rem;
      color: #e4e6eb;
      margin-bottom: 1rem;
    }

    .endpoint {
      margin-bottom: 0.75rem;
      font-family: 'Courier New', monospace;
      font-size: 0.95rem;
      color: #d2d4e0;
      word-break: break-all;
    }

    .endpoint a {
      color: #9fa8ff;
      text-decoration: none;
      transition: color 0.2s, text-shadow 0.2s;
    }

    .endpoint a:hover,
    .endpoint a:focus {
      color: #b8bfff;
      text-shadow: 0 0 6px rgba(159, 168, 255, 0.6);
      outline: none;
    }

    .method {
      display: inline-block;
      padding: 0.25rem 0.6rem;
      border-radius: 0.4rem;
      font-weight: bold;
      margin-right: 0.5rem;
      font-size: 0.75rem;
      color: #fff;
    }

    .method.get    { background: #2196f3; }
    .method.post   { background: #4caf50; }
    .method.put    { background: #ff9800; }
    .method.delete { background: #f44336; }

    /* === Disclaimer === */
    .disclaimer {
      background: rgba(255, 255, 0, 0.1);
      border-left: 4px solid #ffc107;
      padding: 1rem;
      margin-bottom: 2rem;
      border-radius: 0.5rem;
    }

    .disclaimer h3 {
      color: #ffda6b;
      margin-bottom: 0.5rem;
      font-size: 1.1rem;
    }

    .disclaimer p {
      color: #ffeb99;
      font-size: 0.95rem;
    }

    /* === CTA Button === */
    .cta {
      text-align: center;
      margin-top: 1.5rem;
    }

    .button {
      display: inline-block;
      padding: 0.9rem 2rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #fff;
      text-decoration: none;
      border-radius: 0.5rem;
      font-weight: 600;
      font-size: 1rem;
      transition: transform 0.2s, box-shadow 0.2s;
      box-shadow: 0 4px 12px rgba(118, 75, 162, 0.4);
    }

    .button:hover,
    .button:focus {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(118, 75, 162, 0.6);
      outline: none;
    }

    /* === Footer === */
    .footer {
      margin-top: 2rem;
      text-align: center;
      color: #999;
      font-size: 0.9rem;
    }

    /* === Responsive Design === */
    @media (max-width: 768px) {
      .container {
        padding: 2rem 1.5rem;
      }
      h1 {
        font-size: 1.8rem;
      }
      .subtitle {
        font-size: 1rem;
      }
      .endpoint {
        font-size: 0.9rem;
      }
    }

    @media (max-width: 480px) {
      h1 {
        font-size: 1.6rem;
      }
      .button {
        width: 100%;
        padding: 0.9rem;
      }
    }
  </style>
</head>
<body>
  <main class="container" role="main">
    <header>
      <h1>📚 Books Serverless API</h1>
      <p class="subtitle">Simple serverless REST API built with Cloudflare Workers and D1 Database.</p>
    </header>

    <section class="description">
      <p>A modern serverless API for managing a book collection with full CRUD operations, search, pagination, and more — powered by Cloudflare Workers.</p>
    </section>

    <section class="endpoints" aria-label="API Endpoints">
      <h2>API Endpoints</h2>
      <div class="endpoint"><span class="method get">GET</span> <a href="/api/health" target="_blank" rel="noopener">/api/health</a></div>
      <div class="endpoint"><span class="method get">GET</span> <a href="/api/stats" target="_blank" rel="noopener">/api/stats</a></div>
      <div class="endpoint"><span class="method get">GET</span> <a href="/api/books" target="_blank" rel="noopener">/api/books</a></div>
      <div class="endpoint"><span class="method post">POST</span> /api/books</div>
      <div class="endpoint"><span class="method get">GET</span> <a href="/api/books/1" target="_blank" rel="noopener">/api/books/:id</a></div>
      <div class="endpoint"><span class="method put">PUT</span> /api/books/:id</div>
      <div class="endpoint"><span class="method delete">DELETE</span> /api/books/:id</div>
      <div class="endpoint"><span class="method get">GET</span> <a href="/api/books/search?q=romance" target="_blank" rel="noopener">/api/books/search?q=query</a></div>
    </section>

    <aside class="disclaimer">
      <h3>⚠️ Disclaimer</h3>
      <p>This project demonstrates Cloudflare Workers and D1 database capabilities. It is intended for educational and demonstration purposes only.</p>
    </aside>

    <div class="cta">
      <a href="https://github.com/DavidJKTofan/cf-books-serverless-api" class="button" target="_blank" rel="noopener noreferrer">
        View on GitHub →
      </a>
    </div>

    <footer class="footer">
      <p>Built with Cloudflare Workers &amp; D1 Database</p>
    </footer>
  </main>
</body>
</html>`;
};

// Input validation helper
const validateBook = (book, isUpdate = false) => {
	// Required fields check (only for new books)
	if (!isUpdate) {
		const required = ['title', 'author'];
		const missing = required.filter((field) => !book[field]);
		if (missing.length) {
			throw new ValidationError(`Missing required fields: ${missing.join(', ')}`);
		}
	}

	// Title validation
	if (book.title !== undefined) {
		if (typeof book.title !== 'string' || book.title.trim().length === 0) {
			throw new ValidationError('Title must be a non-empty string');
		}
		if (book.title.length > 500) {
			throw new ValidationError('Title must be 500 characters or less');
		}
	}

	// Author validation
	if (book.author !== undefined) {
		if (typeof book.author !== 'string' || book.author.trim().length === 0) {
			throw new ValidationError('Author must be a non-empty string');
		}
		if (book.author.length > 200) {
			throw new ValidationError('Author must be 200 characters or less');
		}
	}

	// Year validation
	if (book.year !== null && book.year !== undefined && book.year !== '') {
		const yearNum = parseInt(book.year);
		const currentYear = new Date().getFullYear();
		if (isNaN(yearNum) || yearNum < 0 || yearNum > currentYear + 10) {
			throw new ValidationError(`Year must be a valid number between 0 and ${currentYear + 10}`);
		}
	}

	// ISBN validation
	if (book.isbn && book.isbn !== '') {
		if (typeof book.isbn !== 'string') {
			throw new ValidationError('ISBN must be a string');
		}
		if (!/^(?:\d{10}|\d{13}|[\d-]{13,17})$/.test(book.isbn)) {
			throw new ValidationError('Invalid ISBN format');
		}
	}

	// Description validation
	if (book.description !== null && book.description !== undefined && book.description !== '') {
		if (typeof book.description !== 'string') {
			throw new ValidationError('Description must be a string');
		}
		if (book.description.length > 5000) {
			throw new ValidationError('Description must be 5000 characters or less');
		}
	}

	// Genre validation
	if (book.genre !== null && book.genre !== undefined && book.genre !== '') {
		if (typeof book.genre !== 'string') {
			throw new ValidationError('Genre must be a string');
		}
		if (book.genre.length > 100) {
			throw new ValidationError('Genre must be 100 characters or less');
		}
	}
};

// Safe number parsing helper
const safeParseInt = (value, defaultValue) => {
	const parsed = parseInt(value);
	return !isNaN(parsed) && parsed > 0 ? parsed : defaultValue;
};

// Response helper
const createResponse = (body, status = 200, headers = {}) => {
	return new Response(body !== null ? JSON.stringify(body, null, 2) : null, {
		status,
		headers: {
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type',
			...headers,
		},
	});
};

// HTML response helper
const createHtmlResponse = (html, status = 200) => {
	return new Response(html, {
		status,
		headers: {
			'Content-Type': 'text/html; charset=utf-8',
			'Cache-Control': 'public, max-age=3600',
		},
	});
};

// Content-Type validation
const validateContentType = (request) => {
	if (['POST', 'PUT'].includes(request.method)) {
		const contentType = request.headers.get('content-type');
		if (!contentType || !contentType.includes('application/json')) {
			throw new ValidationError('Content-Type must be application/json');
		}
	}
};

// Database query execution with timeout
const executeQuery = async (stmt, timeout = 5000) => {
	const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Database query timeout')), timeout));

	return Promise.race([stmt.all(), timeoutPromise]);
};

// Rate limit API Binding
// https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
const checkRateLimit = async (env, request) => {
	if (!env.MY_RATE_LIMITER) {
		return; // Rate limiting not configured
	}

	try {
		const ip = request.headers.get('cf-connecting-ip') || '';
		const { success } = await env.MY_RATE_LIMITER.limit({ key: ip });

		if (!success) {
			throw new RateLimitError('Rate limit exceeded. Please try again later.');
		}
	} catch (error) {
		if (error instanceof RateLimitError) {
			throw error;
		}
		// Log rate limiter errors but don't block requests
		console.error('Rate limiter error:', {
			message: error.message,
			timestamp: new Date().toISOString(),
		});
	}
};

export default {
	async fetch(request, env, ctx) {
		const requestId = crypto.randomUUID();
		const startTime = Date.now();

		// Log request start
		console.log('Request started:', {
			requestId,
			method: request.method,
			url: request.url,
			ip: request.headers.get('cf-connecting-ip'),
			timestamp: new Date().toISOString(),
		});

		// Handle OPTIONS for CORS
		if (request.method === 'OPTIONS') {
			return createResponse(null, 204);
		}

		// Check request size
		const contentLength = request.headers.get('content-length');
		if (contentLength && parseInt(contentLength) > 1048576) {
			return createResponse({ error: 'Request body too large (max 1MB)' }, 413);
		}

		const url = new URL(request.url);
		const params = url.searchParams;

		try {
			// Home landing page
			if (ROUTES.HOME.test(url)) {
				return createHtmlResponse(getLandingPage());
			}

			// Rate limiting check (skip for home page)
			await checkRateLimit(env, request);

			// Validate content type for POST/PUT
			validateContentType(request);

			// Search endpoint
			if (ROUTES.SEARCH.test(url)) {
				const query = params.get('q');
				if (!query) {
					throw new ValidationError('Search query `?q=` is required');
				}

				if (query.length > 200) {
					throw new ValidationError('Search query too long (max 200 characters)');
				}

				const searchTerm = `%${query}%`;
				const { results } = await executeQuery(
					env.DB.prepare(
						`
						SELECT * FROM books 
						WHERE title LIKE ? 
						OR author LIKE ? 
						OR genre LIKE ? 
						OR isbn LIKE ? 
						OR year LIKE ? 
						OR description LIKE ?
						ORDER BY id ASC
					`
					).bind(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm)
				);

				return createResponse(
					{
						query,
						results,
						count: results.length,
					},
					200,
					{
						'Cache-Control': 'public, max-age=60, stale-while-revalidate=120',
					}
				);
			}

			// Books collection endpoint
			if (ROUTES.BOOKS_COLLECTION.test(url)) {
				switch (request.method) {
					case 'GET': {
						const page = safeParseInt(params.get('page'), 1);
						const limit = Math.min(safeParseInt(params.get('limit'), 10), 100);
						const offset = (page - 1) * limit;
						const genre = params.get('genre');
						const year = safeParseInt(params.get('year'), null);

						// Validate genre length if provided
						if (genre && genre.length > 100) {
							throw new ValidationError('Genre parameter too long');
						}

						let query = 'SELECT * FROM books WHERE 1=1';
						const bindings = [];

						if (genre) {
							query += ' AND genre = ?';
							bindings.push(genre);
						}

						if (year) {
							query += ' AND year = ?';
							bindings.push(year);
						}

						const countQuery = query.replace('*', 'COUNT(*) as count');
						const {
							results: [{ count }],
						} = await executeQuery(env.DB.prepare(countQuery).bind(...bindings));

						query += ' ORDER BY id ASC LIMIT ? OFFSET ?';
						bindings.push(limit, offset);

						const { results } = await executeQuery(env.DB.prepare(query).bind(...bindings));

						return createResponse(
							{
								data: results,
								pagination: {
									total: count,
									page,
									limit,
									pages: Math.ceil(count / limit),
								},
							},
							200,
							{
								'Cache-Control': 'public, max-age=60, stale-while-revalidate=120',
							}
						);
					}

					case 'POST': {
						const book = await request.json();
						validateBook(book, false);

						const stmt = env.DB.prepare(
							`
							INSERT INTO books (title, author, year, isbn, genre, description)
							VALUES (?, ?, ?, ?, ?, ?)
						`
						).bind(
							book.title.trim(),
							book.author.trim(),
							book.year || null,
							book.isbn || null,
							book.genre ? book.genre.trim() : null,
							book.description ? book.description.trim() : null
						);

						const result = await stmt.run();

						if (!result.success) {
							throw new Error('Failed to insert book');
						}

						const {
							results: [inserted],
						} = await executeQuery(env.DB.prepare('SELECT * FROM books WHERE id = ?').bind(result.meta.last_row_id));

						console.log('Book created:', {
							requestId,
							bookId: result.meta.last_row_id,
							timestamp: new Date().toISOString(),
						});

						return createResponse(inserted, 201);
					}

					default:
						return createResponse({ error: 'Method not allowed' }, 405);
				}
			}

			// Single book endpoint
			if (ROUTES.SINGLE_BOOK.test(url)) {
				const match = ROUTES.SINGLE_BOOK.exec(url);
				const id = safeParseInt(match.pathname.groups.id, 0);

				if (id === 0) {
					throw new ValidationError('Invalid book ID');
				}

				const {
					results: [book],
				} = await executeQuery(env.DB.prepare('SELECT * FROM books WHERE id = ?').bind(id));

				if (!book) {
					throw new NotFoundError('Book not found');
				}

				switch (request.method) {
					case 'GET':
						return createResponse(book, 200, {
							'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
						});

					case 'PUT': {
						const updates = await request.json();

						// Filter to only allowed fields
						const updateFields = Object.keys(updates).filter((key) => ALLOWED_UPDATE_FIELDS.includes(key));

						if (updateFields.length === 0) {
							throw new ValidationError('No valid fields to update');
						}

						// Validate the merged object
						validateBook({ ...book, ...updates }, true);

						const setClause = updateFields.map((key) => `${key} = ?`).join(', ');
						const values = [
							...updateFields.map((key) => {
								const value = updates[key];
								// Trim string values
								if (typeof value === 'string' && value.trim().length > 0) {
									return value.trim();
								}
								// Convert empty strings to null
								if (value === '') {
									return null;
								}
								return value;
							}),
							id,
						];

						const result = await env.DB.prepare(`UPDATE books SET ${setClause} WHERE id = ?`)
							.bind(...values)
							.run();

						if (!result.success) {
							throw new Error('Failed to update book');
						}

						const {
							results: [updated],
						} = await executeQuery(env.DB.prepare('SELECT * FROM books WHERE id = ?').bind(id));

						console.log('Book updated:', {
							requestId,
							bookId: id,
							updatedFields: updateFields,
							timestamp: new Date().toISOString(),
						});

						return createResponse(updated);
					}

					case 'DELETE': {
						const result = await env.DB.prepare('DELETE FROM books WHERE id = ?').bind(id).run();

						if (!result.success) {
							throw new Error('Failed to delete book');
						}

						console.log('Book deleted:', {
							requestId,
							bookId: id,
							timestamp: new Date().toISOString(),
						});

						return createResponse(null, 204);
					}

					default:
						return createResponse({ error: 'Method not allowed' }, 405);
				}
			}

			// Stats endpoint
			if (ROUTES.STATS.test(url)) {
				const stats = await Promise.all([
					env.DB.prepare('SELECT COUNT(*) as total FROM books').first(),
					env.DB.prepare('SELECT genre, COUNT(*) as count FROM books WHERE genre IS NOT NULL GROUP BY genre ORDER BY count DESC')
						.all()
						.then((r) => r.results),
					env.DB.prepare('SELECT MIN(year) as earliest, MAX(year) as latest FROM books WHERE year IS NOT NULL').first(),
				]);

				return createResponse(
					{
						totalBooks: stats[0].total,
						genreBreakdown: stats[1],
						yearRange: {
							earliest: stats[2].earliest,
							latest: stats[2].latest,
						},
					},
					200,
					{
						'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
					}
				);
			}

			// Health check endpoint
			if (ROUTES.HEALTH.test(url)) {
				await env.DB.prepare('SELECT 1').first();
				return createResponse({
					status: 'healthy',
					timestamp: new Date().toISOString(),
				});
			}

			return createResponse({ error: 'Not Found' }, 404);
		} catch (error) {
			// Structured error logging
			console.error('Request error:', {
				requestId,
				message: error.message,
				stack: error.stack,
				method: request.method,
				url: request.url,
				timestamp: new Date().toISOString(),
			});

			let status = 500;
			let message = 'An unexpected error occurred';

			if (error instanceof ValidationError) {
				status = error.status;
				message = error.message;
			} else if (error instanceof NotFoundError) {
				status = error.status;
				message = error.message;
			} else if (error instanceof RateLimitError) {
				status = error.status;
				message = error.message;
			} else if (error.message.includes('timeout')) {
				status = 504;
				message = 'Request timeout';
			} else if (error.message.includes('JSON')) {
				status = 400;
				message = 'Invalid JSON in request body';
			}

			return createResponse({ error: message }, status);
		} finally {
			// Log request completion
			const duration = Date.now() - startTime;
			console.log('Request completed:', {
				requestId,
				duration,
				timestamp: new Date().toISOString(),
			});
		}
	},
};
