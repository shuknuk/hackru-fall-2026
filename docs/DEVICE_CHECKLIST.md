# M2 physical-device acceptance

Use the latest protected HTTPS staging URL in EXECUTION.md. Sign in to Vercel if prompted. Do not use localhost on the phone. Test an actual iPhone 14 in Safari and the intended desktop Chrome demo device. Chromium mobile emulation is not Safari evidence.

Record device, OS/browser versions, tested commit, camera facing, engine, input dimensions, processed FPS and latency p50/p95. Copy text diagnostics; no camera images need to be uploaded.

1. Open /session. Confirm camera stays off until Start camera. Deny permission once; confirm a readable error and no retained camera stream. Restore permission through browser settings if needed.
2. Select rear camera, Start, and keep the full body in frame with room around the feet. Expand Development diagnostics. Confirm actual skeleton alignment, 33 landmarks when detected, and absence of skeleton when the body is absent. Record 60 seconds of observed responsiveness and diagnostics; confirm Start/Stop remains responsive.
3. Stop and verify the browser camera indicator goes off. Restart twice. Leave the route and verify camera release. Hide Safari or lock the phone; camera should stop and require another explicit Start when returning.
4. Stop, select front camera, and repeat. A facing preference is a browser constraint, not proof of selected hardware; verify the actual camera view.
5. Rotate the phone while live. Verify the video and skeleton stay aligned and controls remain reachable without horizontal overflow. Test interruptions and disconnects where applicable.
6. Compare Worker CPU, Main CPU and Main GPU through the diagnostic selector, stopping before each change. Record actual failures and latency; choose an engine only from device evidence. Slow software-rendered CI performance does not select a phone engine.
7. Record lighting, occlusion and placement failures. This spike does not yet calibrate, count reps, save data, compare sets or support prepared offline replay.

M2 remains partial until live-person inference and usable performance are recorded on the phone and intended demo device. If an engine fails, preserve the error text and explicitly select another engine; there is no silent fallback.
