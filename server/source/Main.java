import com.fastcgi.FCGIInterface;
import java.io.*;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.Properties;

/**
 * FastCGI server for Lab 2 — Variant 22722
 * Receives POST with x, y, r → validates → checks hit → returns JSON
 *
 * Run: FCGI_PORT=XXXXX java -cp out:lib/fastcgi-lib.jar Main
 */
public class Main {

    // Results persist between requests (FastCGI server stays running)
    private static final ArrayList<Map<String, Object>> results = new ArrayList<>();

    // Allowed values
    private static final double X_MIN = -5;
    private static final double X_MAX = 5;
    private static final double[] Y_VALUES = {-3, -2, -1, 0, 1, 2, 3, 4, 5};
    private static final double[] R_VALUES = {1, 1.5, 2, 2.5, 3};

    // Date formatter: Russian format
    private static final DateTimeFormatter FMT =
            DateTimeFormatter.ofPattern("dd.MM.yyyy, HH:mm:ss");

    public static void main(String[] args) {
        FCGIInterface fcgi = new FCGIInterface();

        while (fcgi.FCGIaccept() >= 0) {
            long startNano = System.nanoTime();

            try {
                // Read POST body
                Properties params = FCGIInterface.request.params;
                String contentLengthStr = params.getProperty("CONTENT_LENGTH");
                int contentLength = 0;
                if (contentLengthStr != null && !contentLengthStr.isEmpty()) {
                    contentLength = Integer.parseInt(contentLengthStr.trim());
                }

                String body = "";
                if (contentLength > 0) {
                    byte[] buf = new byte[contentLength];
                    int totalRead = 0;
                    while (totalRead < contentLength) {
                        int read = System.in.read(buf, totalRead, contentLength - totalRead);
                        if (read == -1) break;
                        totalRead += read;
                    }
                    body = new String(buf, 0, totalRead, StandardCharsets.UTF_8);
                }

                // Parse x=...&y=...&r=...
                Map<String, String> formData = parseQuery(body);
                String xStr = formData.get("x");
                String yStr = formData.get("y");
                String rStr = formData.get("r");

                // Validate X
                if (xStr == null || xStr.isEmpty()) {
                    sendError("X не указан");
                    continue;
                }
                double x;
                try {
                    x = Double.parseDouble(xStr.replace(',', '.'));
                } catch (NumberFormatException e) {
                    sendError("X должен быть числом");
                    continue;
                }
                if (x <= X_MIN || x >= X_MAX) {
                    sendError("X должен быть строго от " + (int) X_MIN + " до " + (int) X_MAX);
                    continue;
                }

                // Validate Y
                if (yStr == null || yStr.isEmpty()) {
                    sendError("Y не указан");
                    continue;
                }
                double y;
                try {
                    y = Double.parseDouble(yStr);
                } catch (NumberFormatException e) {
                    sendError("Y должен быть числом");
                    continue;
                }
                if (!isAllowed(y, Y_VALUES)) {
                    sendError("Недопустимое значение Y");
                    continue;
                }

                // Validate R
                if (rStr == null || rStr.isEmpty()) {
                    sendError("R не указан");
                    continue;
                }
                double r;
                try {
                    r = Double.parseDouble(rStr);
                } catch (NumberFormatException e) {
                    sendError("R должен быть числом");
                    continue;
                }
                if (!isAllowed(r, R_VALUES)) {
                    sendError("Недопустимое значение R");
                    continue;
                }

                // Calculate hit
                boolean hit = isHit(x, y, r);

                // Execution time
                long endNano = System.nanoTime();
                double execMs = (endNano - startNano) / 1_000_000.0;

                // Current time
                String now = LocalDateTime.now().format(FMT);

                // Store result
                Map<String, Object> result = new HashMap<>();
                result.put("x", xStr);
                result.put("y", y);
                result.put("r", r);
                result.put("hit", hit);
                result.put("time", now);
                result.put("execTime", String.format("%.3f мс", execMs));
                results.add(0, result); // newest first

                // Send response
                sendSuccess();

            } catch (Exception e) {
                sendError("Внутренняя ошибка сервера: " + e.getMessage());
            }
        }
    }

    /**
     * Region check — Variant 22722:
     * 1) Rectangle in Q2: x ∈ [-R/2, 0], y ∈ [0, R]
     * 2) Quarter circle in Q3: x ≤ 0, y ≤ 0, x²+y² ≤ R²
     * 3) Triangle in Q4: vertices (0,0), (R/2,0), (0,-R) → y ≥ 2x - R
     */
    private static boolean isHit(double x, double y, double r) {
        boolean inRect     = (x >= -r / 2 && x <= 0 && y >= 0 && y <= r);
        boolean inCircle   = (x <= 0 && y <= 0 && x * x + y * y <= r * r);
        boolean inTriangle = (x >= 0 && y <= 0 && y >= 2 * x - r);
        return inRect || inCircle || inTriangle;
    }

    /** Check if value is in the allowed list */
    private static boolean isAllowed(double val, double[] allowed) {
        for (double a : allowed) {
            if (Math.abs(val - a) < 1e-9) return true;
        }
        return false;
    }

    /** Parse URL-encoded query string: key=val&key2=val2 */
    private static Map<String, String> parseQuery(String query) {
        Map<String, String> map = new HashMap<>();
        if (query == null || query.isEmpty()) return map;
        String[] pairs = query.split("&");
        for (String pair : pairs) {
            int eq = pair.indexOf('=');
            if (eq > 0) {
                String key = URLDecoder.decode(pair.substring(0, eq), StandardCharsets.UTF_8);
                String val = URLDecoder.decode(pair.substring(eq + 1), StandardCharsets.UTF_8);
                map.put(key, val);
            }
        }
        return map;
    }

    /** Send JSON error response */
    private static void sendError(String message) {
        String json = "{\"error\":\"" + escapeJson(message) + "\"}";
        System.out.print("Content-Type: application/json\r\n");
        System.out.print("Access-Control-Allow-Origin: *\r\n");
        System.out.print("\r\n");
        System.out.print(json);
        System.out.flush();
    }

    /** Send JSON success with all results */
    private static void sendSuccess() {
        StringBuilder sb = new StringBuilder();
        sb.append("{\"results\":[");
        for (int i = 0; i < results.size(); i++) {
            if (i > 0) sb.append(",");
            Map<String, Object> r = results.get(i);
            sb.append("{");
            sb.append("\"x\":\"").append(escapeJson(String.valueOf(r.get("x")))).append("\",");
            sb.append("\"y\":").append(r.get("y")).append(",");
            sb.append("\"r\":").append(r.get("r")).append(",");
            sb.append("\"hit\":").append(r.get("hit")).append(",");
            sb.append("\"time\":\"").append(escapeJson(String.valueOf(r.get("time")))).append("\",");
            sb.append("\"execTime\":\"").append(escapeJson(String.valueOf(r.get("execTime")))).append("\"");
            sb.append("}");
        }
        sb.append("]}");

        System.out.print("Content-Type: application/json\r\n");
        System.out.print("Access-Control-Allow-Origin: *\r\n");
        System.out.print("\r\n");
        System.out.print(sb.toString());
        System.out.flush();
    }

    /** Escape special characters for JSON string */
    private static String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
    }
}
