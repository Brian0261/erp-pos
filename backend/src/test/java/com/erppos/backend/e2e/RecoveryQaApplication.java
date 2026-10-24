package com.erppos.backend.e2e;

import com.erppos.backend.BackendApplication;
import org.springframework.boot.SpringApplication;
import org.springframework.core.env.MapPropertySource;

/** Separate test-classpath launcher. The existing no-write launcher is unchanged. */
public final class RecoveryQaApplication {
    public static void main(String[] args) {
        try {
            if(args.length!=0)throw new IllegalStateException("QA_ARGUMENTS_FORBIDDEN");
            System.setProperty("spring.devtools.restart.enabled","false");
            System.setProperty("logging.level.root","OFF");
            System.setProperty("spring.main.banner-mode","off");
            var identity=E2eQaConfiguration.Identity.from(System.getenv());
            identity.verifyDatabase();
            var app=new SpringApplication(BackendApplication.class,RecoveryQaConfiguration.class);
            app.setAdditionalProfiles("e2e-qa");
            app.addInitializers(context->context.getEnvironment().getPropertySources()
                    .addFirst(new MapPropertySource("verified-recovery-qa-only",identity.properties())));
            app.run();
        }catch(Exception ex){
            System.err.println("QA_RECOVERY_STARTUP_REJECTED");
            for(Throwable c=ex;c!=null;c=c.getCause())System.err.println("QA_CAUSE_TYPE "+c.getClass().getSimpleName());
            System.exit(1);
        }
    }
}
