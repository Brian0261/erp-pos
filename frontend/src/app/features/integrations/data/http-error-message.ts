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
        : "Conflicto de datos. Revisa el estado actual.";
    case 422:
      return detail
        ? `Validacion fallida: ${detail}`
        : "No se pudo procesar la entidad enviada.";
    case 500:
      return detail
        ? `Error interno: ${detail}`
        : "Error interno del servidor. Intenta nuevamente.";
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
    return payload;
  }

  if (typeof payload.message === "string") {
    return payload.message;
  }

  return "";
}
