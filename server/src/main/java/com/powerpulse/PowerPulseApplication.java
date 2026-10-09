package com.powerpulse;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class PowerPulseApplication {

    public static void main(String[] args) {
        SpringApplication.run(PowerPulseApplication.class, args);
    }
}
