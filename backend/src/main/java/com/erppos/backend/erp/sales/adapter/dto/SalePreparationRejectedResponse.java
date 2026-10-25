package com.erppos.backend.erp.sales.adapter.dto;

import com.erppos.backend.erp.sales.application.usecase.SaleOperationPreparationResult;
import java.util.UUID;

public record SalePreparationRejectedResponse(int protocolVersion, UUID operationId, UUID actorUserId,
        String origin, String code, String outcome, String reasonCode) {
    public static SalePreparationRejectedResponse from(SaleOperationPreparationResult.Rejected rejected) {
        return new SalePreparationRejectedResponse(1, rejected.operationId(), rejected.actorUserId(), rejected.origin(),
                "OPERATION_PREPARATION_REJECTED", "NOT_STORED", rejected.reasonCode());
    }
}
