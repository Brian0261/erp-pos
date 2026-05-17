package com.erppos.backend.erp.catalog.application.service;

import com.erppos.backend.erp.catalog.application.port.ProductImportWorkbookPort;
import com.erppos.backend.erp.catalog.application.usecase.CreateProductCommand;
import com.erppos.backend.erp.catalog.application.usecase.ProductImportUseCase;
import com.erppos.backend.erp.catalog.application.usecase.ProductUseCase;
import com.erppos.backend.erp.catalog.domain.exception.CatalogBusinessRuleException;
import com.erppos.backend.erp.catalog.domain.exception.CatalogConflictException;
import com.erppos.backend.erp.catalog.domain.exception.CatalogNotFoundException;
import com.erppos.backend.erp.catalog.domain.model.Category;
import com.erppos.backend.erp.catalog.domain.model.Product;
import com.erppos.backend.erp.catalog.domain.model.Unit;
import com.erppos.backend.erp.catalog.domain.port.CategoryRepositoryPort;
import com.erppos.backend.erp.catalog.domain.port.ProductRepositoryPort;
import com.erppos.backend.erp.catalog.domain.port.UnitRepositoryPort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Service
public class ProductImportApplicationService implements ProductImportUseCase {
    private static final Set<String> TRUE_VALUES = Set.of("true", "1", "activo", "si", "sí", "yes");
    private static final Set<String> FALSE_VALUES = Set.of("false", "0", "inactivo", "no");

    private final ProductImportWorkbookPort workbookPort;
    private final ProductRepositoryPort productRepositoryPort;
    private final CategoryRepositoryPort categoryRepositoryPort;
    private final UnitRepositoryPort unitRepositoryPort;
    private final ProductUseCase productUseCase;

    public ProductImportApplicationService(
            ProductImportWorkbookPort workbookPort,
            ProductRepositoryPort productRepositoryPort,
            CategoryRepositoryPort categoryRepositoryPort,
            UnitRepositoryPort unitRepositoryPort,
            ProductUseCase productUseCase
    ) {
        this.workbookPort = workbookPort;
        this.productRepositoryPort = productRepositoryPort;
        this.categoryRepositoryPort = categoryRepositoryPort;
        this.unitRepositoryPort = unitRepositoryPort;
        this.productUseCase = productUseCase;
    }

    @Override
    public byte[] downloadTemplate() {
        return workbookPort.createTemplate();
    }

    @Override
    public PreviewResult preview(String originalFilename, byte[] content) {
        validateFile(originalFilename, content);
        List<ParsedRow> rows = workbookPort.parse(content);
        ValidationBatch validation = validateRows(rows);
        return new PreviewResult(
                validation.rows().size(),
                (int) validation.rows().stream().filter(ValidatedRow::valid).count(),
                (int) validation.rows().stream().filter(row -> !row.valid()).count(),
                validation.rows().stream().map(this::toPreviewRow).toList()
        );
    }

    @Override
    public ConfirmResult confirm(ConfirmCommand command) {
        if (command == null || command.rows() == null || command.rows().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "rows are required");
        }

        List<ParsedRow> rows = command.rows().stream()
                .map(row -> new ParsedRow(
                        row.rowNumber(),
                        row.sku(),
                        row.barcode(),
                        row.name(),
                        row.description(),
                        row.category(),
                        row.unit(),
                        row.salePrice(),
                        row.active()
                ))
                .toList();

        ValidationBatch validation = validateRows(rows);
        List<ConfirmRowResult> results = new ArrayList<>();
        int createdRows = 0;

        for (ValidatedRow row : validation.rows()) {
            if (!row.valid()) {
                results.add(new ConfirmRowResult(row.rowNumber(), row.sku(), false, null, row.errors()));
                continue;
            }

            try {
                Product created = productUseCase.create(new CreateProductCommand(
                        row.sku(),
                        row.barcode(),
                        row.name(),
                        row.description(),
                        row.categoryId(),
                        row.unitId(),
                        row.salePriceValue()
                ));
                createdRows += 1;
                results.add(new ConfirmRowResult(row.rowNumber(), row.sku(), true, created.id(), List.of()));
            } catch (CatalogConflictException | CatalogBusinessRuleException | CatalogNotFoundException ex) {
                results.add(new ConfirmRowResult(row.rowNumber(), row.sku(), false, null, List.of(ex.getMessage())));
            }
        }

        return new ConfirmResult(results.size(), createdRows, results.size() - createdRows, results);
    }

    private void validateFile(String originalFilename, byte[] content) {
        if (content == null || content.length == 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "file is required");
        }
        String filename = originalFilename == null ? "" : originalFilename.trim().toLowerCase(Locale.ROOT);
        if (!filename.endsWith(".xlsx")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only .xlsx files are supported");
        }
    }

    private ValidationBatch validateRows(List<ParsedRow> rows) {
        Map<String, Category> categoriesByKey = new LinkedHashMap<>();
        Map<String, Unit> unitsByKey = new LinkedHashMap<>();

        for (Category category : categoryRepositoryPort.findAll()) {
            categoriesByKey.put(normalizeLookup(category.name()), category);
        }
        for (Unit unit : unitRepositoryPort.findAll()) {
            unitsByKey.put(normalizeLookup(unit.code()), unit);
        }

        Map<String, Integer> skuOccurrences = new LinkedHashMap<>();
        Map<String, Integer> barcodeOccurrences = new LinkedHashMap<>();
        for (ParsedRow row : rows) {
            String skuKey = normalizeSkuKey(row.sku());
            if (skuKey != null) {
                skuOccurrences.merge(skuKey, 1, Integer::sum);
            }
            String barcodeKey = normalizeBarcode(row.barcode());
            if (barcodeKey != null) {
                barcodeOccurrences.merge(barcodeKey, 1, Integer::sum);
            }
        }

        List<ValidatedRow> validatedRows = new ArrayList<>();
        for (ParsedRow row : rows) {
            validatedRows.add(validateRow(row, categoriesByKey, unitsByKey, skuOccurrences, barcodeOccurrences));
        }
        return new ValidationBatch(validatedRows);
    }

    private ValidatedRow validateRow(
            ParsedRow row,
            Map<String, Category> categoriesByKey,
            Map<String, Unit> unitsByKey,
            Map<String, Integer> skuOccurrences,
            Map<String, Integer> barcodeOccurrences
    ) {
        List<String> errors = new ArrayList<>();

        String sku = trimToNull(row.sku());
        String barcode = normalizeBarcode(row.barcode());
        String name = trimToNull(row.name());
        String description = trimToNull(row.description());
        String categoryText = trimToNull(row.category());
        String unitText = trimToNull(row.unit());
        String salePriceText = trimToNull(row.salePrice());
        String activeText = trimToNull(row.active());

        if (sku == null) {
            errors.add("SKU is required");
        } else {
            String skuKey = normalizeSkuKey(sku);
            if (skuOccurrences.getOrDefault(skuKey, 0) > 1) {
                errors.add("SKU is duplicated in file");
            }
            if (productRepositoryPort.existsBySkuIgnoreCase(sku)) {
                errors.add("SKU already exists");
            }
        }

        if (barcode != null) {
            if (barcodeOccurrences.getOrDefault(barcode, 0) > 1) {
                errors.add("Barcode is duplicated in file");
            }
            if (productRepositoryPort.existsByBarcode(barcode)) {
                errors.add("Barcode already exists");
            }
        }

        if (name == null) {
            errors.add("Name is required");
        }

        Long categoryId = null;
        if (categoryText == null) {
            errors.add("Category is required");
        } else {
            Category category = categoriesByKey.get(normalizeLookup(categoryText));
            if (category == null) {
                errors.add("Category not found");
            } else if (!category.active()) {
                errors.add("Category is inactive");
            } else {
                categoryId = category.id();
            }
        }

        Long unitId = null;
        if (unitText == null) {
            errors.add("Unit is required");
        } else {
            Unit unit = unitsByKey.get(normalizeLookup(unitText));
            if (unit == null) {
                errors.add("Unit not found");
            } else if (!unit.active()) {
                errors.add("Unit is inactive");
            } else {
                unitId = unit.id();
            }
        }

        BigDecimal salePrice = null;
        if (salePriceText == null) {
            errors.add("salePrice is required");
        } else {
            try {
                salePrice = new BigDecimal(salePriceText);
                if (salePrice.compareTo(BigDecimal.ZERO) < 0) {
                    errors.add("salePrice must be >= 0");
                }
            } catch (NumberFormatException ex) {
                errors.add("salePrice is invalid");
            }
        }

        Boolean active = parseActive(activeText, errors);
        if (active == null) {
            active = true;
        }

        return new ValidatedRow(
                row.rowNumber(),
                sku,
                barcode,
                name,
                description,
                categoryText,
                unitText,
                salePriceText,
                activeText,
                categoryId,
                unitId,
                salePrice,
                active,
                errors.isEmpty(),
                List.copyOf(errors)
        );
    }

    private ProductImportUseCase.PreviewRow toPreviewRow(ValidatedRow row) {
        return new ProductImportUseCase.PreviewRow(
                row.rowNumber(),
                row.sku(),
                row.barcode(),
                row.name(),
                row.description(),
                row.category(),
                row.unit(),
                row.salePrice(),
                row.activeRaw() == null ? Boolean.toString(row.activeValue()) : row.activeRaw(),
                row.valid(),
                row.errors()
        );
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizeLookup(String value) {
        String trimmed = trimToNull(value);
        return trimmed == null ? null : trimmed.replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }

    private String normalizeSkuKey(String value) {
        String trimmed = trimToNull(value);
        return trimmed == null ? null : trimmed.toLowerCase(Locale.ROOT);
    }

    private String normalizeBarcode(String value) {
        String trimmed = trimToNull(value);
        return trimmed == null ? null : trimmed;
    }

    private Boolean parseActive(String rawValue, List<String> errors) {
        if (rawValue == null) {
            return true;
        }
        String normalized = rawValue.trim().toLowerCase(Locale.ROOT);
        if (TRUE_VALUES.contains(normalized)) {
            return true;
        }
        if (FALSE_VALUES.contains(normalized)) {
            return false;
        }
        errors.add("active is invalid");
        return null;
    }

    private record ValidatedRow(
            int rowNumber,
            String sku,
            String barcode,
            String name,
            String description,
            String category,
            String unit,
            String salePrice,
            String activeRaw,
            Long categoryId,
            Long unitId,
            BigDecimal salePriceValue,
            boolean activeValue,
            boolean valid,
            List<String> errors
    ) {
    }

    private record ValidationBatch(List<ValidatedRow> rows) {
    }
}
