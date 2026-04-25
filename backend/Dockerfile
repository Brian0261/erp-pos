FROM eclipse-temurin:17-jdk-jammy AS build
WORKDIR /app
COPY . .
RUN ./mvnw -q -DskipTests clean package

FROM eclipse-temurin:17-jre-jammy
WORKDIR /opt/app
COPY --from=build /app/target/backend-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/opt/app/app.jar"]

