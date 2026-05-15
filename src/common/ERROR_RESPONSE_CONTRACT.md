Global Error Response Contract

All handled API errors follow this shape:
- statusCode: number
- message: string | string[]
- error: string
- timestamp: ISO datetime string
- path: request path
- details?: string[] (present for validation array messages)

Examples
- 400 Bad Request (validation):
  - message is an array of violations
  - details mirrors the message array
- 401 Unauthorized:
  - message is a string
- 404 Not Found:
  - message is a string
- 409 Conflict:
  - message is a string
- 429 Too Many Requests:
  - message is a string from throttler
