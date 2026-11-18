package com.trainlab.activity;

import com.trainlab.common.ApiException;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.SAXException;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;

/**
 * Utilidades de leitura XML compartilhadas pelos parsers TCX e GPX. O DOM é usado de forma
 * consciente de namespaces ({@code getLocalName()}), então arquivos com prefixos distintos
 * (Garmin, Strava, gpxtpx, ns3…) são lidos do mesmo jeito.
 */
final class ActivityXmlSupport {

    private ActivityXmlSupport() {
    }

    static Document parse(byte[] content, String format) {
        try {
            DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
            factory.setNamespaceAware(true);
            factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
            factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
            factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
            factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
            factory.setXIncludeAware(false);
            factory.setExpandEntityReferences(false);
            DocumentBuilder builder = factory.newDocumentBuilder();
            return builder.parse(new ByteArrayInputStream(content));
        } catch (ParserConfigurationException | SAXException | IOException ex) {
            throw ApiException.badRequest("Arquivo " + format + " inválido ou corrompido: "
                    + "não foi possível ler o XML");
        }
    }

    static List<Element> children(Element parent, String localName) {
        List<Element> result = new ArrayList<>();
        if (parent == null) {
            return result;
        }
        for (Node node = parent.getFirstChild(); node != null; node = node.getNextSibling()) {
            if (node.getNodeType() == Node.ELEMENT_NODE && localName.equals(localName(node))) {
                result.add((Element) node);
            }
        }
        return result;
    }

    static Element firstChild(Element parent, String localName) {
        if (parent == null) {
            return null;
        }
        for (Node node = parent.getFirstChild(); node != null; node = node.getNextSibling()) {
            if (node.getNodeType() == Node.ELEMENT_NODE && localName.equals(localName(node))) {
                return (Element) node;
            }
        }
        return null;
    }

    /** Primeiro descendente com o nome local informado, independente do namespace. */
    static Element firstDescendant(Element parent, String localName) {
        if (parent == null) {
            return null;
        }
        NodeList nodes = parent.getElementsByTagNameNS("*", localName);
        return nodes.getLength() == 0 ? null : (Element) nodes.item(0);
    }

    static String localName(Node node) {
        String local = node.getLocalName();
        if (local != null) {
            return local;
        }
        String name = node.getNodeName();
        int colon = name.indexOf(':');
        return colon >= 0 ? name.substring(colon + 1) : name;
    }

    static String text(Element element) {
        if (element == null) {
            return null;
        }
        String value = element.getTextContent();
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    static String textOf(Element parent, String localName) {
        return text(firstChild(parent, localName));
    }

    static String descendantText(Element parent, String localName) {
        return text(firstDescendant(parent, localName));
    }

    static Double doubleValue(Element element) {
        String value = text(element);
        if (value == null) {
            return null;
        }
        try {
            return Double.parseDouble(value.replace(',', '.'));
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    static Double doubleValue(Element parent, String localName) {
        return doubleValue(firstChild(parent, localName));
    }

    static Integer intValue(Element element) {
        Double value = doubleValue(element);
        return value == null ? null : (int) Math.round(value);
    }

    static Integer intValue(Element parent, String localName) {
        return intValue(firstChild(parent, localName));
    }

    /**
     * Aceita timestamps ISO-8601 com offset ({@code 2026-11-18T07:00:00-04:00}),
     * UTC ({@code ...Z}) e, por tolerância, data/hora local sem fuso (assumida UTC).
     */
    static ParsedTime parseTime(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String text = value.trim();
        try {
            OffsetDateTime offsetDateTime = OffsetDateTime.parse(text);
            return new ParsedTime(offsetDateTime.toInstant(), offsetDateTime.getOffset());
        } catch (DateTimeParseException ignored) {
            // tenta LocalDateTime antes de desistir
        }
        try {
            LocalDateTime local = LocalDateTime.parse(text);
            return new ParsedTime(local.toInstant(ZoneOffset.UTC), ZoneOffset.UTC);
        } catch (DateTimeParseException ex) {
            return null;
        }
    }

    record ParsedTime(Instant instant, ZoneOffset offset) {
    }
}
