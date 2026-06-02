const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

/**
 * Wrapper para consumir la Storefront API de forma server-side.
 * No consulta la base de datos directamente.
 * No consume endpoints administrativos.
 */
export async function fetchStorefront(path: string, options?: RequestInit) {
  const url = `${API_URL}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    throw new Error(`Storefront API error: ${res.status}`);
  }

  return res.json();
}
