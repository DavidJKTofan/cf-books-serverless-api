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
	SEARCH: new URLPattern({ pathname: '/api/books/search' }),
	BOOKS_COLLECTION: new URLPattern({ pathname: '/api/books' }),
	SINGLE_BOOK: new URLPattern({ pathname: '/api/books/:id([0-9]+)' }), // Add numeric constraint
	STATS: new URLPattern({ pathname: '/api/stats' }),
	HEALTH: new URLPattern({ pathname: '/api/health' }),
};

// Allowed fields for updates
const ALLOWED_UPDATE_FIELDS = ['title', 'author', 'year', 'isbn', 'genre', 'description'];

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

// Rate limiting check
const checkRateLimit = async (env, request) => {
	// https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
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
			// Rate limiting check
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
