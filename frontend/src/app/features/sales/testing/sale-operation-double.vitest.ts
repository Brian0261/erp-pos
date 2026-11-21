import { vi, type Mocked } from "vitest";
import { HttpErrorResponse } from "@angular/common/http";
import { of, throwError } from "rxjs";
import { PrepareSaleOperationRequest, SaleOperation, SaleOperationsService } from "../data/sale-operations.service";

export function preparedOperation(request: PrepareSaleOperationRequest): SaleOperation {
  return { ...structuredClone(request), state: "PREPARED", cashRegisterSessionId: 7,
    saleId: null, documentId: null, documentStatus: null, receiptState: request.receiptIntent?.receiptType === "TICKET" || !request.receiptIntent ? "NOT_REQUIRED" : "PENDING",
    createdAt: "2026-10-21T00:00:00Z", updatedAt: "2026-10-21T00:00:00Z" };
}
export function createOperationDouble(): Mocked<Pick<SaleOperationsService, "prepare" | "get" | "list" | "cancel">> {
  const rows = new Map<string, SaleOperation>();
  const operations = {
    prepare: vi.fn<SaleOperationsService["prepare"]>(),
    get: vi.fn<SaleOperationsService["get"]>(),
    list: vi.fn<SaleOperationsService["list"]>(),
    cancel: vi.fn<SaleOperationsService["cancel"]>(),
  };
  operations.prepare.mockImplementation(body => { const row = preparedOperation(body); rows.set(row.operationId, row); return of(row); });
  operations.get.mockImplementation(id => rows.has(id) ? of(rows.get(id)!)
    : throwError(() => new HttpErrorResponse({ status: 404 })));
  operations.cancel.mockImplementation(id => {
    const row = rows.get(id);
    if (!row || row.state !== "PREPARED") return throwError(() => new HttpErrorResponse({ status: row ? 409 : 404 }));
    const cancelled: SaleOperation = { ...row, state: "CANCELLED", command: null, quoteCommand: null };
    rows.set(id, cancelled); return of(cancelled);
  });
  operations.list.mockImplementation(page => of({ items: [...rows.values()], page, size: 10, totalItems: rows.size, totalPages: rows.size ? 1 : 0 }));
  return operations;
}
