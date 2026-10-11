import { X509Certificate } from "node:crypto";
import { describe, expect, it } from "vitest";
import tigerCloudCa from "./tiger-cloud-ca.json";

describe("Tiger Cloud CA", () => {
  it("pins the expected certificate authority", () => {
    const certificate = new X509Certificate(tigerCloudCa.certificate);
    expect(certificate.ca).toBe(true);
    expect(certificate.subject).toContain("CN=ca.timescale.com");
    expect(certificate.fingerprint256).toBe("06:5A:75:0D:0D:64:F6:2D:AC:DC:97:9E:3B:83:D2:11:95:40:71:EA:59:B8:F3:40:7C:4E:87:CA:68:34:64:57");
  });
});
