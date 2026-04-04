package com.realhogoo.jsschedule.config;

import com.realhogoo.jsschedule.auth.jwt.JwtProvider;
import com.realhogoo.jsschedule.calendar.mapper.CalendarMapper;
import com.realhogoo.jsschedule.dashboard.mapper.DashboardMapper;
import com.realhogoo.jsschedule.health.mapper.HealthMapper;
import com.realhogoo.jsschedule.project.mapper.ProjectMapper;
import com.realhogoo.jsschedule.task.mapper.TaskMapper;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.mybatis.spring.SqlSessionFactoryBean;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.context.EnvironmentAware;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.PropertySource;
import org.springframework.context.support.PropertySourcesPlaceholderConfigurer;
import org.springframework.core.env.Environment;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.core.io.support.PropertiesLoaderUtils;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;

import javax.sql.DataSource;
import java.io.IOException;
import java.util.Properties;

@Configuration
@EnableTransactionManagement
@MapperScan(basePackageClasses = {
    ProjectMapper.class,
    TaskMapper.class,
    CalendarMapper.class,
    DashboardMapper.class,
    HealthMapper.class
})
@PropertySource(value = {
    "classpath:application.properties",
    "classpath:app.properties"
}, ignoreResourceNotFound = true)
public class InfrastructureConfig implements EnvironmentAware {

    private Environment environment;

    @Override
    public void setEnvironment(Environment environment) {
        this.environment = environment;
    }

    @Bean
    public static PropertySourcesPlaceholderConfigurer propertySourcesPlaceholderConfigurer() {
        return new PropertySourcesPlaceholderConfigurer();
    }

    @Bean
    public JwtProvider jwtProvider() {
        return new JwtProvider(
            requiredProperty("jwt.secret"),
            environment.getProperty("jwt.issuer", "jsAdmin")
        );
    }

    @Bean(destroyMethod = "close")
    public DataSource dataSource() {
        Properties common = loadProperties("db/common.properties");
        Properties database = loadProperties("db/postgres.properties");

        HikariConfig config = new HikariConfig();
        config.setPoolName("schedule-postgres");
        config.setDriverClassName(property(database, "jdbc.driverClassName", "db.driver"));
        config.setJdbcUrl(property(database, "jdbc.url", "db.url"));
        config.setUsername(property(database, "jdbc.username", "db.username"));
        config.setPassword(property(database, "jdbc.password", "db.password"));
        config.setMaximumPoolSize(intProperty(database, common, "jdbc.maximumPoolSize", 5));
        config.setMinimumIdle(intProperty(database, common, "jdbc.minimumIdle", 1));
        config.setConnectionTimeout(longProperty(database, common, "jdbc.connectionTimeoutMs", 30000L));
        config.setValidationTimeout(longProperty(database, common, "jdbc.validationTimeoutMs", 5000L));
        return new HikariDataSource(config);
    }

    @Bean
    public org.apache.ibatis.session.SqlSessionFactory sqlSessionFactory(DataSource dataSource) throws Exception {
        SqlSessionFactoryBean factoryBean = new SqlSessionFactoryBean();
        factoryBean.setDataSource(dataSource);
        factoryBean.setConfigLocation(new ClassPathResource("config/mybatis-config.xml"));

        PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
        Resource[] mapperResources = resolver.getResources("classpath:/mybatis/mappers/postgres/**/*.xml");
        factoryBean.setMapperLocations(mapperResources);
        return factoryBean.getObject();
    }

    @Bean
    public PlatformTransactionManager txManager(DataSource dataSource) {
        return new DataSourceTransactionManager(dataSource);
    }

    private Properties loadProperties(String location) {
        try {
            return PropertiesLoaderUtils.loadProperties(new ClassPathResource(location));
        } catch (IOException exception) {
            throw new IllegalStateException("Failed to load properties: " + location, exception);
        }
    }

    private String requiredProperty(String key) {
        String value = environment.getProperty(key);
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalStateException("Required property missing: " + key);
        }
        return value.trim();
    }

    private String property(Properties source, String key, String envKey) {
        String envValue = environment.getProperty(envKey);
        if (envValue != null && !envValue.trim().isEmpty()) {
            return envValue.trim();
        }
        String value = source.getProperty(key);
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        return environment.resolvePlaceholders(value).trim();
    }

    private int intProperty(Properties source, Properties fallback, String key, int defaultValue) {
        String value = property(source, key, key);
        if (value == null) {
            value = fallback.getProperty(key);
        }
        return value == null ? defaultValue : Integer.parseInt(value);
    }

    private long longProperty(Properties source, Properties fallback, String key, long defaultValue) {
        String value = property(source, key, key);
        if (value == null) {
            value = fallback.getProperty(key);
        }
        return value == null ? defaultValue : Long.parseLong(value);
    }
}
