package com.trainlab.common;

public final class FormatUtils {

    private FormatUtils() {
    }

    public static String formatPace(int totalSeconds) {
        int minutes = totalSeconds / 60;
        int seconds = totalSeconds % 60;
        return minutes + ":" + String.format("%02d", seconds);
    }

    public static String formatPaceRange(Integer fast, Integer slow) {
        if (fast == null && slow == null) {
            return "";
        }
        if (fast == null) {
            return "~" + formatPace(slow);
        }
        if (slow == null) {
            return formatPace(fast) + "~";
        }
        return formatPace(fast) + "–" + formatPace(slow);
    }

    public static String unitLabel(String unit) {
        if (unit == null) {
            return "";
        }
        return switch (unit) {
            case "s_per_km" -> "/km";
            case "s_per_100m" -> "/100m";
            case "w" -> "W";
            case "bpm" -> "bpm";
            default -> unit;
        };
    }

    public static String rangeLabel(Integer min, Integer max) {
        if (min == null && max == null) {
            return "";
        }
        if (min == null) {
            return "~" + max;
        }
        if (max == null) {
            return min + "~";
        }
        return min + "–" + max;
    }
}
