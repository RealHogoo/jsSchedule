FROM eclipse-temurin:17-jre

WORKDIR /app
RUN groupadd --system app && useradd --system --gid app --home-dir /app --shell /usr/sbin/nologin app
COPY --chown=app:app build/libs/*.jar app.jar
USER app

EXPOSE 8082

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
