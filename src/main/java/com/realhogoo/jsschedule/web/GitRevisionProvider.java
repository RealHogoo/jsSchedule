package com.realhogoo.jsschedule.web;

import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@Component
public class GitRevisionProvider {

    private static final String UNKNOWN = "unknown";

    private final String shortRevision;

    public GitRevisionProvider() {
        this.shortRevision = resolveShortRevision();
    }

    public String getShortRevision() {
        return shortRevision;
    }

    private String resolveShortRevision() {
        try {
            Path gitDir = findGitDir(Paths.get("").toAbsolutePath());
            if (gitDir == null) {
                return UNKNOWN;
            }

            String head = readTrimmed(gitDir.resolve("HEAD"));
            String commit = resolveCommit(gitDir, head);
            if (commit == null || commit.length() < 7) {
                return UNKNOWN;
            }
            return commit.substring(0, 7);
        } catch (Exception ignored) {
            return UNKNOWN;
        }
    }

    private Path findGitDir(Path start) throws IOException {
        Path current = start;
        while (current != null) {
            Path dotGit = current.resolve(".git");
            if (Files.isDirectory(dotGit)) {
                return dotGit;
            }
            if (Files.isRegularFile(dotGit)) {
                String gitDirLine = readTrimmed(dotGit);
                if (gitDirLine.startsWith("gitdir:")) {
                    String location = gitDirLine.substring("gitdir:".length()).trim();
                    Path resolved = current.resolve(location).normalize();
                    if (Files.isDirectory(resolved)) {
                        return resolved;
                    }
                }
            }
            current = current.getParent();
        }
        return null;
    }

    private String resolveCommit(Path gitDir, String head) throws IOException {
        if (head == null || head.isEmpty()) {
            return null;
        }
        if (!head.startsWith("ref:")) {
            return sanitizeCommit(head);
        }

        String ref = head.substring("ref:".length()).trim();
        Path refPath = gitDir.resolve(ref);
        if (Files.isRegularFile(refPath)) {
            return sanitizeCommit(readTrimmed(refPath));
        }
        return findPackedRef(gitDir, ref);
    }

    private String findPackedRef(Path gitDir, String ref) throws IOException {
        Path packedRefs = gitDir.resolve("packed-refs");
        if (!Files.isRegularFile(packedRefs)) {
            return null;
        }

        List<String> lines = Files.readAllLines(packedRefs, StandardCharsets.UTF_8);
        for (String line : lines) {
            String trimmed = line == null ? "" : line.trim();
            if (trimmed.isEmpty() || trimmed.startsWith("#") || trimmed.startsWith("^")) {
                continue;
            }
            int separator = trimmed.indexOf(' ');
            if (separator < 0) {
                continue;
            }
            if (ref.equals(trimmed.substring(separator + 1).trim())) {
                return sanitizeCommit(trimmed.substring(0, separator));
            }
        }
        return null;
    }

    private String readTrimmed(Path path) throws IOException {
        return new String(Files.readAllBytes(path), StandardCharsets.UTF_8).trim();
    }

    private String sanitizeCommit(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.matches("[0-9a-fA-F]{7,40}") ? trimmed.toLowerCase() : null;
    }
}
