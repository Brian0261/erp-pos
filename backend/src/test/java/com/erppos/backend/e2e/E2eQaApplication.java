package com.erppos.backend.e2e;

import com.erppos.backend.BackendApplication;
import org.springframework.boot.SpringApplication;
import org.springframework.core.env.MapPropertySource;

/** Test-classpath entry point. No production artifact contains this launcher. */
public final class E2eQaApplication {
    public static void main(String[] args) {
        try {
            if (args.length != 0) throw new IllegalStateException("QA_ARGUMENTS_FORBIDDEN");
            // Set before Spring's bootstrap listeners: the QA process must never restart.
            System.setProperty("spring.devtools.restart.enabled", "false");
            System.setProperty("logging.level.root", "OFF");
            System.setProperty("spring.main.banner-mode", "off");
            var identity = E2eQaConfiguration.Identity.from(System.getenv());
            identity.verifyDatabase(); // Before Spring, Flyway, Hibernate or fixture writes.
            var application = new SpringApplication(BackendApplication.class, E2eQaConfiguration.class);
            application.setAdditionalProfiles("e2e-qa");
            application.addInitializers(context -> context.getEnvironment().getPropertySources()
                    .addFirst(new MapPropertySource("verified-e2e-only", identity.properties())));
            application.run();
        } catch (Exception failure) {
            // Never print JDBC exceptions, configuration values, passwords or tokens.
            System.err.println("QA_BACKEND_STARTUP_REJECTED");
            for (Throwable cause = failure; cause != null; cause = cause.getCause()) {
                System.err.println("QA_CAUSE_TYPE " + cause.getClass().getSimpleName());
                for (var frame : cause.getStackTrace()) {
                    if (frame.getClassName().startsWith("com.erppos.backend.e2e.")) {
                        System.err.println("QA_SOURCE " + frame.getFileName() + ":" + frame.getLineNumber()); break;
                    }
                }
            }
            System.exit(1);
        }
    }
}
