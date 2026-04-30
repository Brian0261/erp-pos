# Language Patterns (Condensed)

- Python: jerarquía de excepciones tipadas + context managers.
- TypeScript: custom errors + `Result<T,E>` para errores esperados.
- Go: errores explícitos con wrapping (`%w`) y `errors.Is/As`.
- Rust: `Result`/`Option`, propagación con `?`, errores tipados.

Regla transversal: capturar donde puedas manejar con contexto real.
