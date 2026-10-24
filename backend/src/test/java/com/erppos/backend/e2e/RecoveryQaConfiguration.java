package com.erppos.backend.e2e;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.zaxxer.hikari.HikariDataSource;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.core.Ordered;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import javax.sql.DataSource;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;

@TestConfiguration(proxyBeanMethods=false)
public class RecoveryQaConfiguration {
    @Bean E2eQaConfiguration.Identity recoveryIdentity(){return E2eQaConfiguration.Identity.from(System.getenv());}
    @Bean DataSource recoveryDataSource(E2eQaConfiguration.Identity id)throws Exception{
        id.verifyDatabase();var ds=new HikariDataSource();ds.setJdbcUrl(id.jdbcUrl());ds.setUsername(id.dbUser());
        ds.setPassword(id.dbPassword());ds.setMaximumPoolSize(5);ds.setPoolName("recovery-qa-"+id.runId());return ds;
    }
    @Bean AtomicBoolean recoveryReady(){return new AtomicBoolean(false);}
    @Bean FilterRegistrationBean<RecoveryQaFilter> recoveryFilter(E2eQaConfiguration.Identity id,DataSource ds,AtomicBoolean ready,ObjectMapper json){
        var bean=new FilterRegistrationBean<>(new RecoveryQaFilter(id,ds,ready,json));
        bean.setName("mandatory-isolated-recovery-qa");bean.setOrder(Ordered.HIGHEST_PRECEDENCE);bean.addUrlPatterns("/*");return bean;
    }
    @Bean ApplicationRunner recoveryFixtures(E2eQaConfiguration.Identity id,DataSource ds,PasswordEncoder passwords,
            AtomicBoolean ready,org.springframework.core.env.Environment env){return args->{
        if(!Arrays.equals(env.getActiveProfiles(),new String[]{"e2e-qa"}) || !"127.0.0.1".equals(env.getProperty("server.address")))
            throw new IllegalStateException("QA_EFFECTIVE_CONFIGURATION_REJECTED");
        try(var c=ds.getConnection()){id.verifyConnection(c);}
        var jdbc=new JdbcTemplate(ds);
        if(jdbc.queryForObject("select (select count(*) from sales)+(select count(*) from sale_operations)+(select count(*) from cash_register_sessions)",Long.class)!=0)
            throw new IllegalStateException("QA_FRESH_DATABASE_REQUIRED");
        jdbc.update("update users set active=false");jdbc.update("update warehouses set active=false");
        jdbc.update("update billing_series set active=false");
        long category=jdbc.queryForObject("insert into categories(name) values(?) returning id",Long.class,"Recovery QA "+id.runId());
        long unit=jdbc.queryForObject("insert into units(code,name,quantity_policy) values('RAUNIT','Unidad QA','WHOLE') returning id",Long.class);
        long warehouse=jdbc.queryForObject("insert into warehouses(code,name,type) values(?,?,'STORE') returning id",Long.class,"RA-"+id.runId(),"Almacen recovery QA");
        String encoded=passwords.encode(id.password());
        // 1..8 belong to commercial journeys; 9..10 belong exclusively to UX journeys.
        for(int n=1;n<=10;n++){
            String username=id.username()+"_"+n;
            UUID actor=UUID.randomUUID();
            jdbc.update("insert into users(id,username,email,password_hash,active) values(?,?,?,?,true)",actor,username,username+"@qa.invalid",encoded);
            jdbc.update("insert into user_roles(user_id,role_id) select ?,id from roles where name='CAJERO'",actor);
            jdbc.update("insert into cash_register_sessions(opened_by_user_id,opened_at,opening_amount,status) values(?,now(),0,'OPEN')",actor);
            long product=jdbc.queryForObject("insert into products(sku,name,category_id,unit_id,sale_price) values(?,?,?,?,10) returning id",Long.class,
                    "RA-"+id.runId()+"-"+n,"Recovery QA "+n+" "+id.runId(),category,unit);
            jdbc.update("insert into stock_balances(product_id,warehouse_id,quantity) values(?,?,100)",product,warehouse);
            if(n==8){
                long quote=jdbc.queryForObject("""
                    insert into quotes(quote_number,customer_name,status,issue_date,expires_at,subtotal_amount,discount_amount,total_amount,created_by,updated_by)
                    values(?,'Cliente sintetico cotizacion','DRAFT',current_date,current_date+30,10,0,10,?,?) returning id
                    """,Long.class,"RA-"+id.runId(),username,username);
                jdbc.update("insert into quote_items(quote_id,product_id,quantity,unit_price,discount_amount,line_total) values(?,?,1,10,0,10)",quote,product);
            }
        }
        String second=id.username()+"_other";UUID other=UUID.randomUUID();
        jdbc.update("insert into users(id,username,email,password_hash,active) values(?,?,?,?,true)",other,second,second+"@qa.invalid",encoded);
        jdbc.update("insert into user_roles(user_id,role_id) select ?,id from roles where name='CAJERO'",other);
        jdbc.update("insert into cash_register_sessions(opened_by_user_id,opened_at,opening_amount,status) values(?,now(),0,'OPEN')",other);
        if(jdbc.queryForObject("select count(*) from company_billing_profile where environment='LOCAL' and active",Integer.class)==0)
            jdbc.update("insert into company_billing_profile(ruc,legal_name,fiscal_address,environment,active,created_by,updated_by) values('20123456789','Emisor sintetico QA','Direccion sintetica','LOCAL',true,'qa','qa')");
        jdbc.update("insert into billing_series(document_type,series,current_number,environment,active,created_by,updated_by) values('RECEIPT','B990',1,'LOCAL',true,'qa','qa'),('INVOICE','F990',1,'LOCAL',true,'qa','qa')");
        ready.set(true);System.out.println("QA_RECOVERY_READY "+id.runId());
    };}
}
