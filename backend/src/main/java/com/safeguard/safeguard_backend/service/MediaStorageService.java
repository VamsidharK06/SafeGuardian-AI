package com.safeguard.safeguard_backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * Development-safe, short-lived storage for a single SOS action's captured
 * evidence (one short camera image/video, one short voice clip) - NOT a
 * general-purpose or long-term media store.
 *
 * Twilio's WhatsApp API needs a publicly reachable URL to fetch media from
 * (it does not accept inline uploads), so a captured file is written here,
 * exposed at /api/media/{filename} by MediaController, and referenced as
 * {PUBLIC_BASE_URL}/api/media/{filename}. PUBLIC_BASE_URL is a configurable
 * environment variable (e.g. a Cloudflare Tunnel URL such as
 * https://xxxx.trycloudflare.com during development) - nothing is
 * hard-coded here.
 *
 * Files are deleted automatically a short delay after being stored, so
 * evidence does not linger on disk once Twilio has had time to fetch it.
 */
@Service
public class MediaStorageService {

    @Value("${media.storage.dir:${java.io.tmpdir}/safeguard-media}")
    private String storageDir;

    /** e.g. https://xxxx.trycloudflare.com or http://localhost:8080 - no trailing slash expected. */
    @Value("${media.public-base-url:${PUBLIC_BASE_URL:}}")
    private String publicBaseUrl;

    @Value("${media.cleanup-delay-seconds:900}")
    private long cleanupDelaySeconds;

    private final ScheduledExecutorService cleanupExecutor =
            Executors.newSingleThreadScheduledExecutor(r -> {
                Thread t = new Thread(r, "media-cleanup");
                t.setDaemon(true);
                return t;
            });

    public boolean isPublicUrlConfigured() {
        return publicBaseUrl != null && !publicBaseUrl.isBlank();
    }

    /**
     * Stores the given evidence file and returns its publicly-accessible
     * URL, or null if PUBLIC_BASE_URL is not configured (in which case the
     * caller should treat media delivery for this item as NOT_CONFIGURED
     * rather than guessing at a URL Twilio could never actually reach).
     */
    public String storeAndGetPublicUrl(MultipartFile file, String prefix) throws IOException {
        if (file == null || file.isEmpty()) {
            return null;
        }
        if (!isPublicUrlConfigured()) {
            return null;
        }

        Path dir = Paths.get(storageDir);
        Files.createDirectories(dir);

        String extension = extensionFor(file);
        String filename = prefix + "-" + UUID.randomUUID() + extension;
        Path target = dir.resolve(filename);

        try (var in = file.getInputStream()) {
            Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
        }

        scheduleCleanup(target);

        String base = publicBaseUrl.endsWith("/")
                ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1)
                : publicBaseUrl;
        return base + "/api/media/" + filename;
    }

    public Path resolve(String filename) {
        return Paths.get(storageDir).resolve(filename).normalize();
    }

    public boolean isInStorageDir(Path path) {
        return path.startsWith(Paths.get(storageDir).normalize());
    }

    private void scheduleCleanup(Path path) {
        cleanupExecutor.schedule(() -> {
            try {
                Files.deleteIfExists(path);
            } catch (IOException e) {
                System.err.println("[MediaStorageService] Failed to clean up " + path + ": " + e.getMessage());
            }
        }, cleanupDelaySeconds, TimeUnit.SECONDS);
    }

    private String extensionFor(MultipartFile file) {
        String original = file.getOriginalFilename();
        if (original != null && original.contains(".")) {
            return original.substring(original.lastIndexOf('.')).toLowerCase(Locale.ROOT);
        }
        String contentType = file.getContentType();
        if (contentType == null) return "";
        if (contentType.contains("jpeg")) return ".jpg";
        if (contentType.contains("png")) return ".png";
        if (contentType.contains("webm")) return ".webm";
        if (contentType.contains("mp4")) return ".mp4";
        if (contentType.contains("mpeg")) return ".mp3";
        if (contentType.contains("wav")) return ".wav";
        return "";
    }
}
