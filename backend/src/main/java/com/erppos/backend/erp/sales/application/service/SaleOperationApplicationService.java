package com.erppos.backend.erp.sales.application.service;

import com.erppos.backend.erp.sales.application.usecase.*;
import com.erppos.backend.erp.sales.domain.port.*;
import com.erppos.backend.erp.sales.domain.model.CashRegisterStatus;
import com.erppos.backend.erp.sales.domain.exception.*;
import com.erppos.backend.erp.quotes.domain.port.QuoteRepositoryPort;
import com.erppos.backend.erp.quotes.domain.model.QuoteStatus;
import com.erppos.backend.erp.quotes.application.service.QuoteSaleCommandFactory;
import com.erppos.backend.erp.quotes.application.usecase.ConvertQuoteToSaleCommand;
import com.erppos.backend.erp.billing.domain.port.BillingSeriesRepositoryPort;
import com.erppos.backend.erp.shared.domain.policy.CommercialMoneyPolicy;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDate;
import java.util.*;

@Service
public class SaleOperationApplicationService implements SaleOperationUseCase {
    private static final Logger LOG = LoggerFactory.getLogger(SaleOperationApplicationService.class);
    private final SaleOperationRecoveryPort recovery;
    private final SaleOperationPort operations;
    private final CashRegisterRepositoryPort cash;
    private final WarehouseReadPort warehouses;
    private final CatalogReadPort catalog;
    private final QuoteRepositoryPort quotes;
    private final BillingSeriesRepositoryPort series;
    private final AuditUserProvider actor;
    private final ObjectMapper json;
    public SaleOperationApplicationService(SaleOperationRecoveryPort recovery, SaleOperationPort operations,
            CashRegisterRepositoryPort cash, WarehouseReadPort warehouses, CatalogReadPort catalog,
            QuoteRepositoryPort quotes, BillingSeriesRepositoryPort series, AuditUserProvider actor, ObjectMapper json) {
        this.recovery=recovery; this.operations=operations; this.cash=cash; this.warehouses=warehouses;
        this.catalog=catalog; this.quotes=quotes; this.series=series; this.actor=actor; this.json=json;
    }
    @Override @Transactional(timeout=15)
    public SaleOperationPreparationResult prepare(PrepareSaleOperationCommand input) {
        if (input.protocolVersion()!=1 || input.operationId()==null) throw invalid("Unsupported operation protocol or missing operationId");
        CreateSaleCommand command;
        if ("QUOTE".equals(input.origin())) {
            if (input.quoteId()==null || input.quoteCommand()==null || input.command()!=null || input.receiptIntent()!=null
                    || !input.operationId().equals(input.quoteCommand().operationId())) throw invalid("Invalid quote preparation");
            var quote=quotes.findByIdForUpdate(input.quoteId()).orElseThrow(() -> new SalesNotFoundException("Quote not found"));
            command=QuoteSaleCommandFactory.toCommand(quote,input.quoteCommand());
            // Existing immutable operation can be recovered even after the quote conversion.
        } else if ("POS".equals(input.origin())) {
            if (input.command()==null || input.quoteId()!=null || input.quoteCommand()!=null || input.receiptIntent()==null
                    || !input.operationId().equals(input.command().operationId())) throw invalid("Invalid POS preparation");
            command=input.command();
            if (!"POS".equals(command.source())) throw invalid("Invalid POS source");
        } else throw invalid("Invalid operation origin");
        String hash=SaleRequestIdentity.hash(command);
        ReceiptIntent intent=normalizeIntent(input.receiptIntent());
        String intentJson=encode(intent);
        String intentHash=digest(input.origin()+":"+input.quoteId()+":"+intentJson);
        UUID owner=actor.currentUserId();
        operations.lock(owner,input.operationId());
        var prior=recovery.findOwned(owner,input.operationId());
        if (prior.isPresent()) {
            var old=prior.get();
            if (!old.requestHash().equals(hash) || !Objects.equals(old.intentHash(),intentHash))
                throw conflict("OPERATION_CONTENT_MISMATCH","The frozen command or receipt intent differs");
            return new SaleOperationPreparationResult.Durable(result(old,true));
        }
        if (input.quoteId()!=null) {
            var quote=quotes.findById(input.quoteId()).orElseThrow(() -> new SalesNotFoundException("Quote not found"));
            if (quote.convertedSaleId()!=null || (quote.status()!=QuoteStatus.DRAFT && quote.status()!=QuoteStatus.SENT)
                    || quote.expiresAt().isBefore(LocalDate.now())) throw conflict("OPERATION_QUOTE_UNAVAILABLE","Quote cannot be prepared");
        }
        // Only application validation before any write is certifiably NOT_STORED. Persistence, lock,
        // authentication and unclassified failures still escape and can never produce this outcome.
        try {
            validateCommand(command);
            validateSeries(intent);
        } catch (SalesBusinessRuleException | SalesNotFoundException rejected) {
            if (!"POS".equals(input.origin())) throw rejected;
            return new SaleOperationPreparationResult.Rejected(input.operationId(), owner, input.origin(),
                    rejected instanceof SalesNotFoundException ? "RESOURCE_UNAVAILABLE" : "COMMAND_INVALID");
        }
        var open=cash.findOpenByUserId(owner).orElseThrow(() -> conflict("OPERATION_CASH_UNAVAILABLE","Open your cash register before preparation"));
        var original=cash.findByIdForUpdate(open.id()).orElseThrow(() -> new SalesNotFoundException("Cash register not found"));
        if (!owner.equals(original.openedByUserId()) || original.status()!=CashRegisterStatus.OPEN)
            throw conflict("OPERATION_CASH_UNAVAILABLE","Original cash register is not open");
        recovery.prepare(new SaleOperationRecoveryPort.Operation(owner,input.operationId(),1,input.origin(),"PREPARED",hash,
                intentHash,original.id(),null,input.quoteId(),encode(command),encode(input.quoteCommand()),intent==null?null:intentJson,
                null,null,null,null));
        audit(input.operationId(),"PREPARED");
        return new SaleOperationPreparationResult.Durable(get(input.operationId()));
    }
    @Override @Transactional(readOnly=true)
    public SaleOperationResult get(UUID id) { return result(owned(id),true); }
    @Override @Transactional(readOnly=true)
    public SaleOperationPageResult list(int page,int size,String state,boolean attention) {
        if (page<0 || page>100000 || size<1 || size>100) throw invalid("Pagination out of bounds");
        if (state!=null && !Set.of("PREPARED","COMPLETED","CANCELLED").contains(state)) throw invalid("Invalid operation state");
        UUID owner=actor.currentUserId(); long total=recovery.countOwned(owner,state,attention);
        return new SaleOperationPageResult(recovery.listOwned(owner,state,attention,page*size,size).stream().map(o->result(o,false)).toList(),
                page,size,total,(int)((total+size-1)/size));
    }
    @Override @Transactional(timeout=15)
    public SaleOperationResult cancel(UUID id) {
        operations.lock(actor.currentUserId(),id);
        var operation=owned(id);
        if ("COMPLETED".equals(operation.state())) throw conflict("OPERATION_ALREADY_COMPLETED","A completed sale cannot be cancelled as a preparation");
        if ("PREPARED".equals(operation.state())) { recovery.cancel(actor.currentUserId(),id); audit(id,"CANCELLED"); }
        return get(id);
    }
    private SaleOperationRecoveryPort.Operation owned(UUID id) {
        return recovery.findOwned(actor.currentUserId(),id).orElseThrow(() -> new SalesNotFoundException("Operation not found"));
    }
    private SaleOperationResult result(SaleOperationRecoveryPort.Operation o, boolean detail) {
        boolean prepared="PREPARED".equals(o.state());
        ReceiptIntent intent=decode(o.receiptIntent(),ReceiptIntent.class);
        String state="COMPLETED".equals(o.state()) && o.saleId()==null ? "RESULT_UNAVAILABLE" : o.state();
        String receipt= o.protocolVersion()==0 ? "REVIEW_REQUIRED" : intent==null || "TICKET".equals(intent.receiptType()) ? "NOT_REQUIRED"
                : o.documentId()!=null ? "LOCATED" : intent.payload()==null || "CANCELLED".equals(state) || "RESULT_UNAVAILABLE".equals(state) ? "REVIEW_REQUIRED" : "PENDING";
        // List rows do not carry customer identifiers; detail keeps them only while still needed.
        if (!detail && intent!=null) intent=new ReceiptIntent(intent.receiptType(),null);
        return new SaleOperationResult(o.operationId(),o.protocolVersion(),o.origin(),state,o.cashSessionId(),o.saleId(),o.quoteId(),
                detail&&prepared?decode(o.commandSnapshot(),CreateSaleCommand.class):null,
                detail&&prepared?decode(o.quoteSnapshot(),ConvertQuoteToSaleCommand.class):null,
                intent,o.documentId(),o.documentStatus(),receipt,o.createdAt(),o.updatedAt());
    }
    private void validateCommand(CreateSaleCommand c) {
        if(c.items().size()>200 || c.payments().size()>20) throw invalid("Too many checkout lines");
        if (!warehouses.existsAndActive(c.warehouseId())) throw new SalesNotFoundException("Warehouse not found or inactive");
        BigDecimal total=BigDecimal.ZERO;
        Set<Long> ids=new HashSet<>();
        for (var line:c.items()) {
            if (!ids.add(line.productId())) throw invalid("Duplicated product in sale items");
            var product=catalog.findById(line.productId()).orElseThrow(() -> new SalesNotFoundException("Product not found"));
            if (!product.active() || product.quantityPolicy()==null) throw invalid("Product unavailable");
            var qty=product.quantityPolicy().validateNew(line.quantity(),SalesBusinessRuleException::new);
            total=total.add(CommercialMoneyPolicy.line(line.confirmedUnitPrice(),qty,line.discountAmount(),SalesBusinessRuleException::new).net());
        }
        if (total.compareTo(c.confirmedTotal())!=0) throw invalid("Confirmed lines and total do not reconcile");
        BigDecimal paid=BigDecimal.ZERO,electronic=BigDecimal.ZERO;
        for(var payment:c.payments()) {
            if(payment.paymentMethod()==null) throw invalid("Payment method is required");
            BigDecimal amount=CommercialMoneyPolicy.positive(payment.amount(),"payment",SalesBusinessRuleException::new);
            if(payment.reference()!=null && payment.reference().length()>120) throw invalid("Payment reference too long");
            paid=paid.add(amount);
            if(payment.paymentMethod()!=com.erppos.backend.erp.sales.domain.model.PaymentMethod.CASH) electronic=electronic.add(amount);
        }
        if(paid.compareTo(total)<0 || electronic.compareTo(total)>0) throw invalid("Payments do not reconcile");
    }
    private ReceiptIntent normalizeIntent(ReceiptIntent intent) {
        if(intent==null) return null;
        if("TICKET".equals(intent.receiptType())) {
            if(intent.payload()!=null) throw invalid("Ticket cannot contain an electronic intent");
            return intent;
        }
        if(!Set.of("RECEIPT","INVOICE").contains(String.valueOf(intent.receiptType())) || intent.payload()==null) throw invalid("Receipt intent is required");
        var p=intent.payload(); String name=trim(p.customerName()),document=trim(p.customerDocument());
        if(!intent.receiptType().equals(p.documentType()) || p.billingSeriesId()==null) throw invalid("Receipt type or series mismatch");
        if(name!=null && name.length()>180 || document!=null && document.length()>20) throw invalid("Receipt identity too long");
        if("INVOICE".equals(intent.receiptType()) && (name==null || document==null || !document.matches("[0-9]{11}"))) throw invalid("Invoice customer identity is required");
        if("RECEIPT".equals(intent.receiptType()) && document!=null && !document.matches("[0-9]{8}")) throw invalid("Invalid receipt customer identity");
        return new ReceiptIntent(intent.receiptType(),new ReceiptIntent.Payload(p.documentType(),p.billingSeriesId(),name,document));
    }
    private void validateSeries(ReceiptIntent intent) {
        if(intent==null || intent.payload()==null) return;
        var s=series.findById(intent.payload().billingSeriesId()).orElseThrow(() -> new SalesNotFoundException("Billing series not found"));
        if(!s.active() || !s.documentType().name().equals(intent.receiptType())) throw invalid("Billing series is incompatible");
    }
    private String trim(String value) { return value==null || value.trim().isEmpty()?null:value.trim(); }
    private String encode(Object value) { if(value==null) return null; try{return json.writeValueAsString(value);}catch(Exception e){throw new IllegalStateException("Cannot encode operation",e);} }
    private <T>T decode(String value,Class<T> type) {if(value==null)return null;try{return json.readValue(value,type);}catch(Exception e){throw new IllegalStateException("Invalid stored operation protocol",e);} }
    private String digest(String value){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException(e);} }
    private SalesBusinessRuleException invalid(String message){return new SalesBusinessRuleException(message);}
    private SaleOperationConflictException conflict(String code,String message){return new SaleOperationConflictException(code,message);}
    private void audit(UUID id,String state){
        UUID owner=actor.currentUserId();
        org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(
                new org.springframework.transaction.support.TransactionSynchronization(){
                    @Override public void afterCommit(){LOG.info("sale_operation actor={} operation={} transition={} result=COMMITTED at={}",owner,id,state,java.time.Instant.now());}
                });
    }
}
