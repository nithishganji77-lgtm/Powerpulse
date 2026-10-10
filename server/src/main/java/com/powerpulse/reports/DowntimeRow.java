package com.powerpulse.reports;

/** Mirrors {@code DowntimeRow} in client/src/types/api.ts. */
public record DowntimeRow(String transformerId, String code, String location, long offlineIncidents,
                          long totalOfflineSeconds) {
}
