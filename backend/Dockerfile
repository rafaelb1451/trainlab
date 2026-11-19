# Build multi-stage: compila com Maven e roda só com o JRE.
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build

# Camada de dependências separada: só baixa de novo quando o pom muda.
COPY pom.xml .
RUN mvn -B -q dependency:go-offline

COPY src ./src
RUN mvn -B -q -DskipTests package

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Roda como usuario sem privilegio.
RUN addgroup -S app && adduser -S app -G app
COPY --from=build /build/target/*.jar app.jar
RUN mkdir -p /app/data && chown -R app:app /app
USER app

EXPOSE 8080
ENV JAVA_OPTS="-XX:MaxRAMPercentage=75 -XX:+ExitOnOutOfMemoryError"
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar app.jar"]
