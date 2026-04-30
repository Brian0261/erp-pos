# REST Best Practices (Condensed)

- Use plural resources (`/users`, `/orders`).
- Keep nesting shallow (max ~2 levels).
- Use standard status codes and consistent error shape.
- Support filtering/sorting/search with query params.
- Paginate all list endpoints.
- Version API and define deprecation policy.
- Add rate limiting headers and `429` handling.
- Document everything in OpenAPI.
