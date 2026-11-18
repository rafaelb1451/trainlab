package com.trainlab.activity;

import com.trainlab.common.ApiException;
import org.springframework.stereotype.Component;

import java.util.Locale;

/**
 * Detecta o formato pelo nome do arquivo e delega ao parser correspondente. Extensão
 * desconhecida responde 415 com uma mensagem útil (o contrato da SPEC 12.2).
 */
@Component
public class ActivityFileParser {

    private final TcxParser tcxParser;
    private final GpxParser gpxParser;
    private final FitParser fitParser;

    public ActivityFileParser(TcxParser tcxParser, GpxParser gpxParser, FitParser fitParser) {
        this.tcxParser = tcxParser;
        this.gpxParser = gpxParser;
        this.fitParser = fitParser;
    }

    public ParsedFile parse(String fileName, byte[] content) {
        if (fileName == null || fileName.isBlank()) {
            throw ApiException.badRequest("Envie um arquivo com nome e extensão .tcx, .gpx ou .fit");
        }
        if (content == null || content.length == 0) {
            throw ApiException.badRequest("O arquivo enviado está vazio");
        }
        String extension = extensionOf(fileName);
        return switch (extension) {
            case "tcx" -> new ParsedFile(ActivitySource.TCX, tcxParser.parse(content, fileName));
            case "gpx" -> new ParsedFile(ActivitySource.GPX, gpxParser.parse(content, fileName));
            case "fit" -> new ParsedFile(ActivitySource.FIT, fitParser.parse(content, fileName));
            default -> throw ApiException.unsupportedMediaType(
                    "Formato ." + extension + " não suportado. Importe arquivos .tcx ou .gpx"
                            + " (para .fit é feito um parser mínimo; se falhar, exporte em TCX/GPX).");
        };
    }

    private String extensionOf(String fileName) {
        int dot = fileName.lastIndexOf('.');
        if (dot < 0 || dot == fileName.length() - 1) {
            return "";
        }
        return fileName.substring(dot + 1).trim().toLowerCase(Locale.ROOT);
    }

    public record ParsedFile(ActivitySource source, ParsedActivity activity) {
    }
}
