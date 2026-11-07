package com.erppos.backend.erp.sales.adapter.rest;

import com.erppos.backend.erp.billing.domain.model.ElectronicDocumentStatus;
import com.erppos.backend.erp.sales.adapter.dto.SalesListItemResponse;
import com.erppos.backend.erp.sales.application.service.SalesListQueryService;
import com.erppos.backend.erp.sales.application.usecase.SalesListQuery;
import com.erppos.backend.erp.sales.domain.model.SaleStatus;
import com.erppos.backend.erp.shared.adapter.dto.PageResponse;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.function.Function;

@RestController
@RequestMapping("/api/v2/sales")
public class SalesV2Controller {
    private final SalesListQueryService sales;

    public SalesV2Controller(SalesListQueryService sales) {
        this.sales = sales;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('CAJERO','ADMIN','SUPERVISOR')")
    public ResponseEntity<PageResponse<SalesListItemResponse>> list(@RequestParam MultiValueMap<String, String> params) {
        SalesListQuery query = parseQuery(params);
        var result = sales.list(query);
        long total = result.totalItems();
        int size = query.size();
        int pages = Math.toIntExact(total / size + (total % size == 0 ? 0 : 1));
        var response = new PageResponse<>(result.items().stream().map(SalesListItemResponse::from).toList(),
                query.page(), size, total, pages);
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(response);
    }

    private static SalesListQuery parseQuery(MultiValueMap<String, String> params) {
        Integer requestedPage = parse(params, "page", Integer::valueOf);
        Integer requestedSize = parse(params, "size", Integer::valueOf);
        int page = requestedPage == null ? 0 : requestedPage;
        int size = requestedSize == null ? 20 : requestedSize;
        if (page < 0 || page > 100_000) {
            throw invalid("page");
        }
        if (size != 20 && size != 50 && size != 100) {
            throw invalid("size");
        }

        String number = text(params, "saleNumber", 1, 40);
        String prefix = text(params, "saleNumberPrefix", 3, 40);
        if (number != null && prefix != null) {
            throw invalid("saleNumber/saleNumberPrefix");
        }
        Long cashSession = parse(params, "cashRegisterSessionId", Long::valueOf);
        if (cashSession != null && cashSession <= 0) {
            throw invalid("cashRegisterSessionId");
        }
        ElectronicDocumentStatus documentStatus = parse(params, "documentStatus", ElectronicDocumentStatus::valueOf);
        return new SalesListQuery(page, size, number, prefix,
                parse(params, "from", SalesV2Controller::commercialDate),
                parse(params, "to", SalesV2Controller::commercialDate),
                parse(params, "status", SaleStatus::valueOf), cashSession, text(params, "createdBy", 1, 120),
                parse(params, "hasElectronicDocument", SalesV2Controller::documentPresence),
                documentStatus == null ? null : documentStatus.name());
    }

    private static LocalDate commercialDate(String value) {
        if (!value.matches("[0-9]{4}-[0-9]{2}-[0-9]{2}") || value.startsWith("0000")) {
            throw new IllegalArgumentException();
        }
        return LocalDate.parse(value);
    }

    private static Boolean documentPresence(String value) {
        return switch (value) {
            case "true" -> true;
            case "false" -> false;
            default -> throw new IllegalArgumentException();
        };
    }

    private static String text(MultiValueMap<String, String> params, String key, int minimum, int maximum) {
        var values = params.get(key);
        if (values == null) {
            return null;
        }
        if (values.size() != 1) {
            throw invalid(key);
        }
        String value = values.get(0).strip();
        int length = value.codePointCount(0, value.length());
        if (length < minimum || length > maximum || value.codePoints().anyMatch(Character::isISOControl)) {
            throw invalid(key);
        }
        return value;
    }

    private static <T> T parse(MultiValueMap<String, String> params, String key, Function<String, T> parser) {
        String value = text(params, key, 1, 40);
        if (value == null) {
            return null;
        }
        try {
            return parser.apply(value);
        } catch (IllegalArgumentException | DateTimeParseException ex) {
            throw invalid(key);
        }
    }

    private static ResponseStatusException invalid(String key) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid parameter: " + key);
    }
}
