import { expect, test } from "@playwright/test";
import { openTwoPeers } from "@baditaflorin/mesh-common/testing";
import { readFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8")) as {
  name: string;
};
const storagePrefix = pkg.name;

/**
 * Load-bearing cross-peer test for the advertised core action:
 *
 *   "One device is the instructor; the rest are students following along.
 *    Class state (sequence id, current pose index, when the pose started) is a
 *    single Y.Map entry shared via y-webrtc."
 *
 * Peer A becomes the instructor and starts / advances the canned pose
 * sequence. Peer B is a student. We assert that peer B's UI reflects the pose
 * index AND the synced countdown that peer A drove — i.e. the shared class
 * state crosses the mesh.
 *
 * This FAILS if the class state were kept in local React `useState` instead of
 * the shared `mesh.doc.getMap("class")` — peer B would stay on the "Waiting for
 * instructor…" idle screen forever.
 */
test("instructor advancing the pose sequence syncs the pose + timer to a student peer", async ({
  browser,
  baseURL,
}) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    // Peer A: switch role to instructor via the Settings drawer.
    await openSettings(a);
    await a.locator('select:has(option[value="instructor"])').selectOption("instructor");
    // Close the drawer (overlay backdrop) so the arm button underneath is
    // reachable. The header "Close" (×) button is the canonical control.
    await a.getByRole("button", { name: "close" }).click();
    await expect(a.getByRole("dialog", { name: "Settings" })).toBeHidden();

    // Role propagated into the arm screen.
    await expect(a.getByRole("button", { name: /Open instructor view/i })).toBeVisible();

    // Peer A arms the instructor view; peer B arms as a student (default role).
    await a.getByRole("button", { name: /Open instructor view/i }).click();
    await b.getByRole("button", { name: /Allow motion & connect/i }).click();

    // Student starts on the idle "Waiting for instructor…" screen — this is the
    // pre-condition that proves the sync is what flips it.
    await expect(b.getByText(/Waiting for instructor/i)).toBeVisible();

    // Instructor starts the class → writes {currentIdx:0, poseStartedAt} into
    // the shared Y.Map.
    await a.getByRole("button", { name: /Start class/i }).click();

    // The first pose name comes from the shared sequence; assert the student now
    // shows a pose name + a live countdown driven by the shared poseStartedAt.
    // (.stretch-pose-name only renders when classState.currentIdx >= 0, which is
    // only ever set by the instructor's transact on the shared doc.)
    await expect(b.locator(".stretch-pose-name")).toBeVisible({ timeout: 10_000 });
    const firstPose = (await b.locator(".stretch-pose-name").textContent())?.trim() ?? "";
    expect(firstPose.length).toBeGreaterThan(0);

    // The synced countdown is visible on the student and counting in seconds.
    await expect(b.locator(".stretch-countdown-big")).toBeVisible();
    await expect(b.locator(".stretch-countdown-big")).toHaveText(/\d+s/);

    // Instructor manually advances to the next pose (Next →) → new currentIdx in
    // the shared map. Assert the student's pose name changes to a different pose.
    await a.getByRole("button", { name: /Next/i }).click();
    await expect(async () => {
      const next = (await b.locator(".stretch-pose-name").textContent())?.trim() ?? "";
      expect(next).not.toBe(firstPose);
    }).toPass({ timeout: 10_000 });
  } finally {
    await cleanup();
  }
});

/**
 * Load-bearing cross-peer test for the advertised privacy feature:
 *
 *   "The instructor sees only the aggregate — '5 / 8 holding' — never who's
 *    wobbling."
 *
 * The aggregate denominator (number of students) is computed from each peer's
 * y-protocols *awareness* role broadcast, NOT from the shared Y.Map. This is a
 * separate cross-peer path from the pose-sync test above. We assert the
 * instructor's "X / N" readout counts a student peer that joins the room.
 *
 * This FAILS if the awareness role wiring breaks (wrong field key, stale
 * freshness window, or counting the instructor itself) — the instructor would
 * stay stuck on "0 / 0".
 */
test("instructor's aggregate readout counts a student peer over awareness", async ({
  browser,
  baseURL,
}) => {
  const { a, b, cleanup } = await openTwoPeers(browser, baseURL ?? "", { storagePrefix });
  try {
    // Peer A becomes the instructor; peer B stays a student (default).
    await openSettings(a);
    await a.locator('select:has(option[value="instructor"])').selectOption("instructor");
    await a.getByRole("button", { name: "close" }).click();
    await expect(a.getByRole("dialog", { name: "Settings" })).toBeHidden();

    await a.getByRole("button", { name: /Open instructor view/i }).click();

    // Before the student arms, the instructor counts zero students.
    await expect(a.locator(".stretch-aggregate-num")).toHaveText(/0\s*\/\s*0/);

    // Student arms → broadcasts role:"student" via awareness.
    await b.getByRole("button", { name: /Allow motion & connect/i }).click();

    // The instructor's denominator must reach 1 (the student), and never count
    // itself. We poll because awareness republishes on a 1s loop.
    await expect(a.locator(".stretch-aggregate-num")).toHaveText(/\d+\s*\/\s*1/, {
      timeout: 10_000,
    });
  } finally {
    await cleanup();
  }
});

/** Open the MeshShell settings drawer if it isn't already open. */
async function openSettings(page: import("@playwright/test").Page) {
  const drawer = page.getByRole("dialog", { name: "Settings" });
  if (!(await drawer.isVisible().catch(() => false))) {
    await page.getByLabel("Open settings").click();
  }
  await expect(drawer).toBeVisible();
}
