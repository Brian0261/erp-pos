package com.erppos.backend.erp.billing.application.service;

import com.erppos.backend.erp.billing.domain.model.ElectronicDocument;
import com.erppos.backend.erp.billing.domain.model.ProviderSendResult;

/** Test-only bridge to the package-local completion boundary. Never included in the application artifact. */
public final class FiscalFinalizationTestAccess {
    private FiscalFinalizationTestAccess() {}

    public static final class Handle {
        private final FiscalSendPreparation preparation;
        private Handle(FiscalSendPreparation preparation) { this.preparation = preparation; }
        public Long documentId() { return preparation.document().id(); }
        public Long attemptId() { return preparation.attemptId(); }
        public String hash() { return preparation.requestHash(); }
        public String payload() { return preparation.signedXml(); }
    }

    public static Handle prepare(FiscalSendTransactionService service, long document) {
        var outcome = service.prepareSend(document);
        if (!outcome.isReady()) throw outcome.failure().toException();
        return new Handle(outcome.preparation());
    }

    /** Reconstruct only in tests to exercise replay and forged correlations against persisted guards. */
    public static Handle recorded(ElectronicDocument document, Long attempt, String hash, String payload) {
        return new Handle(new FiscalSendPreparation(document, attempt, hash, payload));
    }

    public static Handle changed(Handle handle, ElectronicDocument document, Long attempt, String hash, String payload) {
        return recorded(document == null ? handle.preparation.document() : document, attempt, hash, payload);
    }

    public static ElectronicDocument complete(FiscalSendTransactionService service, Handle handle, ProviderSendResult result) {
        return service.finalizeSend(handle.preparation, result);
    }

    public static ElectronicDocument fail(FiscalSendTransactionService service, Handle handle, RuntimeException failure) {
        return service.finalizeAmbiguousFailure(handle.preparation, failure);
    }
}
