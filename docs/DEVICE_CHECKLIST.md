# Physical-device and final MVP acceptance

Use the latest protected HTTPS staging URL in EXECUTION.md. Sign in to Vercel if prompted. Do not use localhost on the phone. Test an actual iPhone 14 in Safari and the intended desktop Chrome demo device. Chromium mobile emulation is not Safari evidence.

Record device, OS/browser versions, tested commit, camera facing, engine, input dimensions, processed FPS and latency p50/p95. Copy text diagnostics; no camera images need to be uploaded.

1. Open /session. Confirm camera stays off until Start camera. Deny permission once; confirm a readable error and no retained camera stream. Restore permission through browser settings if needed.
2. Select rear camera, Start, and keep the full body in frame with room around the feet. Expand Development diagnostics. Confirm actual skeleton alignment, 33 landmarks when detected, and absence of skeleton when the body is absent. Record 60 seconds of observed responsiveness and diagnostics; confirm Start/Stop remains responsive.
3. Stop and verify the browser camera indicator goes off. Restart twice. Leave the route and verify camera release. Hide Safari or lock the phone; camera should stop and require another explicit Start when returning.
4. Stop, select front camera, and repeat. A facing preference is a browser constraint, not proof of selected hardware; verify the actual camera view.
5. Rotate the phone while live. Verify the video and skeleton stay aligned and controls remain reachable without horizontal overflow. Test interruptions and disconnects where applicable.
6. Compare Worker CPU, Main CPU and Main GPU through the diagnostic selector, stopping before each change. Record actual failures and latency; choose an engine only from device evidence. Slow software-rendered CI performance does not select a phone engine.
7. Record lighting, occlusion and placement failures. Do not infer movement accuracy from the prerecorded SDK integration or synthetic fixtures.

M2 remains partial until live-person inference and usable performance are recorded on the phone and intended demo device. If an engine fails, preserve the error text and explicitly select another engine; there is no silent fallback.


## Complete MVP flow after camera checks

Record tested commit and deployment URL with each result. These checks are deliberately deferred while the iPhone is unavailable.

1. With a consenting tester and stable side view, choose the anatomical side, calibrate standing and one comfortable setup cycle, then manually count five repetitions. Compare detected complete reps; test shallow/unfinished motion, occlusion and tracking loss. Repeat with three different-height consenting testers if available and report the actual sample size.
2. Finish while tracking is lost. Confirm camera release, saved results, matching counts/timestamps after reload and usable no-valid-rep behavior. Test interruption while recording: recover the bounded draft without claiming the unfinished rep or the last uncheckpointed seconds.
3. Record Set B using the saved profile and standing recheck. Confirm compatibility decisions, actual-duration medians, selected rep alignment and observation evidence. Change side/facing/profile to check incompatibility explanations.
4. Replay, pause, seek, choose reps and change speed. Confirm no skeleton appears across missing data, and controls remain reachable at phone width, with keyboard and reduced-motion settings where supported.
5. Export both sets, import them into a separate browser context and check the import label and recomputed metrics. Delete a session and all data only after retaining any wanted exports. Check storage failure and quota behavior where practical.
6. Prepare offline while online. Wait for verified readiness. Disable networking and hard reload history, saved replay and comparison. Test lazy controls after reload. Camera tracking is not promised offline. Restore networking and test repair after cache eviction.
7. Install with Safari Share → Add to Home Screen. Launch standalone, repeat permissions and saved replay. Record actual storage sharing or separation instead of assuming installed Safari shares data. Repeat prepared offline hard reload in standalone.
8. During a recording, deploy a distinct build and check the waiting update remains blocked in all open recording tabs. Finish, apply the update and verify old/new bundle cache behavior and saved data. The automated generation test covers coordination, not a real distinct-bundle upgrade.
9. Run three 90-second sessions on the intended demo device and record latency, processed FPS, responsiveness, heat, camera release, storage and failures. Rehearse the three-minute demo three times on a frozen commit. Record organizer code/AI-use eligibility before submission.

Keep failed and untested checks visible. Browser automation and synthetic sequences do not substitute for physical-camera, Safari installation, movement accuracy or event eligibility evidence.
