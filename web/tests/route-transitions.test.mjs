import test from "node:test";
import assert from "node:assert/strict";
import { createRouteTransitions } from "../dist/route-transitions.js";
const tick = () => new Promise((resolve) => setImmediate(resolve));
function fixture({ reduced = false, hidden = false } = {}) {
  const records = [],
    listeners = new Map();
  const motion = {
    matches: reduced,
    addEventListener: (n, f) => listeners.set("motion", f),
    removeEventListener: () => listeners.delete("motion"),
  };
  const page = {
    hidden,
    addEventListener: (n, f) => listeners.set(n, f),
    removeEventListener: (n) => listeners.delete(n),
  };
  function element(name) {
    return {
      animate(frames, options) {
        let resolve, reject;
        const animation = {
          finished: new Promise((r, j) => {
            resolve = r;
            reject = j;
          }),
          finish() {
            resolve();
          },
          cancel() {
            this.cancelled = true;
            reject(Error("cancelled"));
          },
        };
        records.push({ name, frames, options, animation });
        return animation;
      },
    };
  }
  return {
    controller: createRouteTransitions({ motion, page }),
    records,
    motion,
    page,
    listeners,
    outgoing: element("home"),
    incoming: element("science"),
  };
}
test("outgoing fade finishes before commit; incoming fade does not await the data loader", async () => {
  const f = fixture(),
    events = [];
  let ready;
  const pending = f.controller.run({
    ...f,
    commit: () => {
      events.push("commit");
      return new Promise((r) => (ready = r));
    },
  });
  assert.deepEqual(events, []);
  assert.equal(f.records[0].options.duration, 110);
  f.records[0].animation.finish();
  await tick();
  assert.deepEqual(events, ["commit"]);
  assert.equal(f.records[1].options.duration, 240);
  assert.deepEqual(f.records[1].frames, [{ opacity: 0 }, { opacity: 1 }]);
  f.records[1].animation.finish();
  ready();
  assert.equal(await pending, true);
  assert.equal(f.controller.diagnostics().active, false);
  assert.ok(f.records.every((r) => r.animation.cancelled));
  f.controller.dispose();
});
test("a superseding navigation cannot commit the outgoing destination", async () => {
  const f = fixture(),
    events = [];
  const first = f.controller.run({ ...f, commit: () => events.push("old") });
  const second = f.controller.run({
    ...f,
    animate: false,
    commit: () => events.push("latest"),
  });
  assert.equal(await first, false);
  assert.equal(await second, true);
  assert.deepEqual(events, ["latest"]);
  f.controller.dispose();
});
test("superseding an entering route cleans its animation without cancelling its successor", async () => {
  const f = fixture();
  let release;
  const first = f.controller.run({
    ...f,
    commit: () => new Promise((r) => (release = r)),
  });
  f.records[0].animation.finish();
  await tick();
  const second = f.controller.run({ ...f, commit: () => {} });
  const newExit = f.records[2].animation;
  release();
  await tick();
  assert.equal(await first, false);
  assert.ok(!newExit.cancelled);
  newExit.finish();
  await tick();
  f.records[3].animation.finish();
  assert.equal(await second, true);
  f.controller.dispose();
});
test("reduced motion, hidden pages and first load have no animation or artificial delay", async () => {
  for (const options of [
    { reduced: true },
    { hidden: true },
    { animate: false },
  ]) {
    const f = fixture(options);
    let committed = false;
    const pending = f.controller.run({
      ...f,
      animate: options.animate,
      commit: () => {
        committed = true;
      },
    });
    assert.ok(committed);
    assert.equal(await pending, true);
    assert.equal(f.records.length, 0);
    f.controller.dispose();
  }
});
test("missing or throwing Web Animations support still commits the route", async () => {
  for (const outgoing of [
    {},
    {
      animate() {
        throw Error("unsupported");
      },
    },
  ]) {
    const f = fixture();
    let committed = false;
    assert.equal(
      await f.controller.run({
        ...f,
        outgoing,
        incoming: outgoing,
        commit: () => {
          committed = true;
        },
      }),
      true,
    );
    assert.ok(committed);
    assert.equal(f.controller.diagnostics().active, false);
    f.controller.dispose();
  }
});
test("preference changes interrupt motion and still finish navigation", async () => {
  const f = fixture();
  let committed = false;
  const pending = f.controller.run({
    ...f,
    commit: () => {
      committed = true;
    },
  });
  f.motion.matches = true;
  f.listeners.get("motion")();
  assert.equal(await pending, true);
  assert.ok(committed);
  assert.equal(f.records.length, 1);
  f.controller.dispose();
});
test("stale route guard prevents commit and commit errors leave no animation behind", async () => {
  const f = fixture();
  let current = true,
    committed = false;
  const pending = f.controller.run({
    ...f,
    isCurrent: () => current,
    commit: () => {
      committed = true;
    },
  });
  current = false;
  f.records[0].animation.finish();
  assert.equal(await pending, false);
  assert.equal(committed, false);
  await assert.rejects(
    f.controller.run({
      ...f,
      animate: false,
      commit: () => {
        throw Error("load failed");
      },
    }),
    /load failed/,
  );
  assert.equal(f.controller.diagnostics().active, false);
  f.controller.dispose();
});
test("disposing cancels pending motion and removes preference/visibility listeners", async () => {
  const f = fixture();
  let committed = false;
  const pending = f.controller.run({
    ...f,
    commit: () => {
      committed = true;
    },
  });
  f.controller.dispose();
  assert.equal(await pending, false);
  assert.equal(committed, false);
  assert.equal(f.listeners.size, 0);
});
