package com.erppos.backend.erp.purchases.adapter.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SupplierUpdateRequest(
        @Size(max = 40, message = "documentNumber max length is 40")
        String documentNumber,
        @NotBlank(message = "name is required")
        @Size(max = 180, message = "name max length is 180")
        String name,
        @Size(max = 120, message = "contactName max length is 120")
        String contactName,
        @Size(max = 40, message = "phone max length is 40")
        String phone,
        @Email(message = "email format is invalid")
        @Size(max = 160, message = "email max length is 160")
        String email,
        @Size(max = 300, message = "address max length is 300")
        String address,
        Boolean active
) {
}

