import { HttpErrorResponse } from "@angular/common/http";

export function toHttpErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  if (!(error instanceof HttpErrorResponse)) {
    return fallbackMessage;
  }

  const detail = extractDetail(error);

  switch (error.status) {
    case 0:
      return "No hay conexion con el servidor. Verifica que el backend este activo.";
    case 400:
      return detail
        ? `Solicitud invalida: ${detail}`
        : "Solicitud invalida. Verifica los datos enviados.";
    case 401:
      return "Sesion expirada o no autenticada. Inicia sesion nuevamente.";
    case 403:
      return "No tienes permisos para esta accion.";
    case 404:
      return detail
        ? `No encontrado: ${detail}`
        : "El recurso solicitado no existe.";
    case 409:
      return detail
        ? `Conflicto: ${detail}`
        : "Conflicto de datos. Revisa valores duplicados.";
    case 413:
      return "El archivo o la importación es demasiado grande para el límite actual. Intenta dividir el archivo o contacta al administrador.";
    case 422:
      return detail
        ? `Validacion fallida: ${detail}`
        : "No se pudo procesar la entidad enviada.";
    default:
      return detail ? `Error ${error.status}: ${detail}` : fallbackMessage;
  }
}

function extractDetail(error: HttpErrorResponse): string {
  const payload = error.error;

  if (!payload) {
    return "";
  }

  if (typeof payload === "string") {
    return looksLikeHtml(payload) ? "" : payload;
  }

  if (typeof payload.message === "string") {
    return looksLikeHtml(payload.message) ? "" : payload.message;
  }

  return "";
}

function looksLikeHtml(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized.startsWith("<!doctype") || normalized.startsWith("<html");
}
