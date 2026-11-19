package com.trainlab.integration;

import com.trainlab.common.ApiException;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.Map;

/**
 * Cliente HTTP do Intervals.icu.
 *
 * <p>Autenticacao: Basic com usuario literal {@code API_KEY} e senha = chave do atleta.
 * O {@code description} do evento e' interpretado pelo Intervals.icu e vira passos
 * estruturados; quando o atleta tem a Garmin conectada la, o treino desce para o relogio.</p>
 */
@Component
public class IntervalsIcuClient {

    private static final String BASE_URL = "https://intervals.icu/api/v1";

    private final RestClient client;

    public IntervalsIcuClient() {
        this.client = RestClient.builder()
                .baseUrl(BASE_URL)
                .build();
    }

    /** Valida a chave e devolve id/nome do atleta no Intervals.icu. */
    public AthleteProfile athlete(String apiKey, String athleteId) {
        try {
            Map<?, ?> body = client.get()
                    .uri("/athlete/{id}", athleteId)
                    .headers(headers -> headers.setBasicAuth("API_KEY", apiKey))
                    .accept(MediaType.APPLICATION_JSON)
                    .retrieve()
                    .body(Map.class);
            if (body == null) {
                throw ApiException.badRequest("O Intervals.icu nao devolveu dados para este atleta");
            }
            String id = body.get("id") == null ? athleteId : String.valueOf(body.get("id"));
            String name = body.get("name") == null ? null : String.valueOf(body.get("name"));
            return new AthleteProfile(id, name);
        } catch (RestClientResponseException ex) {
            throw translate(ex);
        } catch (ResourceAccessException ex) {
            throw ApiException.badRequest(
                    "Nao foi possivel falar com o Intervals.icu agora. Tente novamente em instantes.");
        }
    }

    /** Cria o evento (treino planejado) no calendario do atleta e devolve o id remoto. */
    public String createEvent(String apiKey, String athleteId, Map<String, Object> event) {
        try {
            Map<?, ?> body = client.post()
                    .uri("/athlete/{id}/events?upsertOnUid=false", athleteId)
                    .headers(headers -> headers.setBasicAuth("API_KEY", apiKey))
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .body(event)
                    .retrieve()
                    .body(Map.class);
            if (body == null || body.get("id") == null) {
                throw ApiException.badRequest("O Intervals.icu aceitou o envio mas nao devolveu o evento");
            }
            return String.valueOf(body.get("id"));
        } catch (RestClientResponseException ex) {
            throw translate(ex);
        } catch (ResourceAccessException ex) {
            throw ApiException.badRequest(
                    "Nao foi possivel falar com o Intervals.icu agora. Tente novamente em instantes.");
        }
    }

    private ApiException translate(RestClientResponseException ex) {
        int status = ex.getStatusCode().value();
        String detail = ex.getResponseBodyAsString();
        String suffix = detail == null || detail.isBlank() ? "" : " (" + summarize(detail) + ")";
        return switch (status) {
            case 401 -> ApiException.badRequest("Chave de API do Intervals.icu invalida" + suffix);
            case 403 -> ApiException.forbidden("O Intervals.icu negou o acesso com esta chave" + suffix);
            case 404 -> ApiException.badRequest(
                    "Atleta nao encontrado no Intervals.icu. Confira o ID (ex.: i123456)" + suffix);
            case 422, 400 -> ApiException.badRequest(
                    "O Intervals.icu recusou o treino: " + detail);
            default -> ApiException.badRequest(
                    "Erro " + status + " ao falar com o Intervals.icu" + suffix);
        };
    }

    private String summarize(String detail) {
        String flat = detail.replaceAll("\\s+", " ").trim();
        return flat.length() > 160 ? flat.substring(0, 160) + "..." : flat;
    }

    public record AthleteProfile(String id, String name) {
    }
}
