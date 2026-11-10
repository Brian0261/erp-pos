import { convertToParamMap } from "@angular/router";
import { decodeSalesPage, salesPeriodDates, salesQueryFromUrl, salesQueryParams, validateSalesQuery } from "./sales-list-query";

describe("Sales v2 query boundary", () => {
  it("round-trips valid typed context and excludes unrelated navigation parameters", () => {
    const query = validateSalesQuery({ saleNumberPrefix: "A%_", page: 1, size: 50, hasElectronicDocument: false });
    expect(salesQueryFromUrl(convertToParamMap({ ...salesQueryParams(query), returnUrl: "https://invalid.test" }))).toEqual(query);
  });
  it("rejects repeated, invalid and incompatible filter parameters", () => {
    for (const raw of [{ salesPage: ["1", "2"] }, { salesSize: "21" }, { salesPage: "100001" },
      { salesPrefix: "ab" }, { salesNumber: "A", salesPrefix: "abc" },
      { salesFrom: "2032-01-02", salesTo: "2032-01-01" }, { salesHasDocument: "false", salesDocumentStatus: "DRAFT" }]) {
      expect(() => salesQueryFromUrl(convertToParamMap(raw))).toThrow();
    }
  });
  it("uses Lima through midnight, month end and the start of the year", () => {
    expect(salesPeriodDates("today", "2033-01-01T04:59:59Z")).toEqual({ from: "2032-12-31", to: "2032-12-31" });
    expect(salesPeriodDates("week", "2033-01-01T05:00:00Z")).toEqual({ from: "2032-12-26", to: "2033-01-01" });
    expect(salesPeriodDates("month", "2032-03-01T01:00:00Z")).toEqual({ from: "2032-02-01", to: "2032-02-29" });
  });
  it("accepts true empty/out-of-range responses and rejects incoherent pages", () => {
    const query = validateSalesQuery({ page: 2, size: 20 });
    expect(decodeSalesPage({ items: [], page: 2, size: 20, totalItems: 21, totalPages: 2 }, query).items).toEqual([]);
    for (const payload of [[], { items: [], page: 2, size: 20, totalItems: 41, totalPages: 3 },
      { items: [], page: 2, size: 20, totalItems: -1, totalPages: 0 }, { items: [], page: 2, size: 50, totalItems: 0, totalPages: 0 }]) {
      expect(() => decodeSalesPage(payload, query)).toThrow();
    }
  });
});
