package com.erppos.backend.e2e;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.*;
import jakarta.servlet.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.filter.OncePerRequestFilter;
import javax.sql.DataSource;
import java.io.IOException;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

/** Fixed commercial allowlist exists only in the independently attested ephemeral test application. */
public final class RecoveryQaFilter extends OncePerRequestFilter {
    public static final String DIAG="/api/v1/health/recovery-e2e";
    private final E2eQaConfiguration.Identity id;private final DataSource ds;private final AtomicBoolean ready;
    private final ObjectMapper json;private final AtomicInteger denied=new AtomicInteger();
    public RecoveryQaFilter(E2eQaConfiguration.Identity id,DataSource ds,AtomicBoolean ready,ObjectMapper json){this.id=id;this.ds=ds;this.ready=ready;this.json=json;}
    @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain)throws IOException,ServletException{
        response.setHeader("X-QA-Run-Id",id.runId());response.setHeader("X-QA-Recovery","enforced");response.setHeader("Cache-Control","no-store");
        String path=request.getRequestURI();
        if("GET".equals(request.getMethod())&&(path.equals(DIAG)||path.equals(DIAG+"/snapshot"))){
            try{
                try(var c=ds.getConnection()){id.verifyConnection(c);}
                response.setContentType("application/json");response.setStatus(ready.get()?200:503);
                if(!ready.get())return;
                var jdbc=new JdbcTemplate(ds);
                if(path.equals(DIAG)){
                    var data=new LinkedHashMap<String,Object>();data.put("runId",id.runId());data.put("database",id.database());data.put("dbUser",id.dbUser());
                    data.put("systemId",id.systemId());data.put("markerMatched",true);data.put("ready",true);data.put("filter","recovery-enforced");
                    data.put("pid",ProcessHandle.current().pid());data.put("proxyRunId",Objects.toString(request.getHeader("X-QA-Proxy-Run"),""));data.put("denied",denied.get());
                    data.put("cases",jdbc.queryForList("""
                        select u.username,u.id as actor_id,c.id as cash_id,p.id as product_id,p.name as product_name,sb.warehouse_id,
                        (select id from quotes where created_by=u.username limit 1) as quote_id
                        from users u join cash_register_sessions c on c.opened_by_user_id=u.id
                        join products p on p.sku='RA-'||?||'-'||substring(u.username from '[0-9]+$')
                        join stock_balances sb on sb.product_id=p.id where u.active order by u.username
                        """,id.runId()));
                    data.put("series",jdbc.queryForList("select id,document_type,series,current_number from billing_series where active and environment='LOCAL' order by id"));
                    json.writeValue(response.getOutputStream(),data);
                }else{
                    int fixture=Integer.parseInt(request.getParameter("case"));if(fixture<1||fixture>10)throw new IllegalArgumentException();
                    String user=id.username()+"_"+fixture;
                    var data=new LinkedHashMap<String,Object>(jdbc.queryForMap("""
                        select c.id as cash_id,c.status as cash_status,c.expected_cash_amount,
                        (select count(*) from sales s where s.cash_register_session_id=c.id) as sales,
                        (select count(*) from sale_payments sp join sales s on s.id=sp.sale_id where s.cash_register_session_id=c.id) as payments,
                        (select coalesce(sum(sp.amount),0) from sale_payments sp join sales s on s.id=sp.sale_id where s.cash_register_session_id=c.id) as paid,
                        (select coalesce(sum(s.change_amount),0) from sales s where s.cash_register_session_id=c.id and s.status='COMPLETED') as cash_change,
                        (select count(*) from inventory_movements m where m.product_id=p.id and m.reference_type='SALE') as movements,
                        (select coalesce(sum(m.quantity),0) from inventory_movements m where m.product_id=p.id and m.reference_type='SALE') as movement_quantity,
                        (select quantity from stock_balances where product_id=p.id limit 1) as stock,
                        (select count(*) from electronic_documents d join sales s on s.id=d.sale_id where s.cash_register_session_id=c.id) as documents,
                        (select converted_sale_id from quotes where created_by=u.username limit 1) as quote_sale_id
                        from users u join cash_register_sessions c on c.opened_by_user_id=u.id
                        join products p on p.sku=? where u.username=?
                        ""","RA-"+id.runId()+"-"+fixture,user));
                    String operation=request.getParameter("operationId");
                    if(operation!=null){
                        UUID uuid=UUID.fromString(operation);
                        var rows=jdbc.queryForList("""
                            select o.operation_id,o.state,o.sale_id,o.request_hash,o.intent_hash,o.original_cash_session_id,o.origin,o.quote_id,
                            o.command_snapshot::text,o.quote_snapshot::text,o.receipt_intent::text,o.document_id,
                            d.document_type,d.status as document_status,d.billing_series_id,d.customer_name,d.customer_document,
                            d.full_number,(select current_number from billing_series where id=d.billing_series_id) as next_number
                            from sale_operations o join users u on u.id=o.actor_user_id left join electronic_documents d on d.id=o.document_id
                            where u.username=? and o.operation_id=?
                            """,user,uuid);
                        data.put("operation",rows.isEmpty()?null:rows.get(0));
                    }
                    data.put("runId",id.runId());json.writeValue(response.getOutputStream(),data);
                }
            }catch(Exception ex){response.setStatus(503);}return;
        }
        if(!ready.get()){response.setStatus(503);return;}
        if(!allowed(request.getMethod(),path)){denied.incrementAndGet();response.setStatus(405);response.setContentType("application/json");response.getWriter().write("{\"code\":\"QA_RECOVERY_DENIED\"}");return;}
        chain.doFilter(request,response);
    }
    static boolean allowed(String method,String path){
        if("POST".equals(method))return Set.of("/api/v1/auth/login","/api/v1/sales","/api/v1/sales/operations").contains(path)
                ||path.matches("/api/v1/sales/operations/[0-9a-fA-F-]{36}/cancel")
                ||path.matches("/api/v1/billing/documents/from-sale/[0-9]+")
                ||path.matches("/api/v1/quotes/[0-9]+/convert-to-sale")||path.matches("/api/v1/cash-registers/[0-9]+/close");
        if(!"GET".equals(method))return false;
        return Set.of("/api/v1/auth/me","/api/v1/warehouses","/api/v1/billing/series","/api/v1/cash-registers/current",
                "/api/v1/pos/products/search","/api/v1/pos/products/lookup","/api/v1/pos/products/snapshot","/api/v1/products",
                "/api/v1/sales","/api/v1/sales/operations","/api/v1/quotes","/api/v1/billing/documents").contains(path)
                ||path.matches("/api/v1/(quotes|sales|cash-registers)/[0-9]+")
                ||path.matches("/api/v1/sales/operations/[0-9a-fA-F-]{36}");
    }
}
