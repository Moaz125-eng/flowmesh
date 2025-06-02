import { describe, it, expect } from "vitest";
import { validateDag } from "../src/workflows/dag.js";

const node = (id: string) => ({ id, type: "log", config: {} });

describe("validateDag", () => {
  it("accepts a single-node workflow", () => {
    const dag = validateDag([node("a")], []);
    expect(dag.order).toEqual(["a"]);
    expect(dag.roots).toEqual(["a"]);
  });

  it("topologically sorts a chain", () => {
    const dag = validateDag(
      [node("a"), node("b"), node("c")],
      [
        { from: "a", to: "b" },
        { from: "b", to: "c" },
      ],
    );
    expect(dag.order).toEqual(["a", "b", "c"]);
    expect(dag.roots).toEqual(["a"]);
  });

  it("rejects duplicate node ids", () => {
    expect(() => validateDag([node("a"), node("a")], [])).toThrow(/duplicate/);
  });

  it("rejects edges to unknown nodes", () => {
    expect(() =>
      validateDag([node("a")], [{ from: "a", to: "missing" }]),
    ).toThrow(/unknown node/);
  });

  it("rejects self-loops", () => {
    expect(() =>
      validateDag([node("a")], [{ from: "a", to: "a" }]),
    ).toThrow(/self-loop/);
  });

  it("rejects cycles", () => {
    expect(() =>
      validateDag(
        [node("a"), node("b"), node("c")],
        [
          { from: "a", to: "b" },
          { from: "b", to: "c" },
          { from: "c", to: "a" },
        ],
      ),
    ).toThrow(/cycle/);
  });

  it("identifies multiple roots", () => {
    const dag = validateDag(
      [node("a"), node("b"), node("c")],
      [
        { from: "a", to: "c" },
        { from: "b", to: "c" },
      ],
    );
    expect(dag.roots.sort()).toEqual(["a", "b"]);
    expect(dag.order[2]).toBe("c");
  });

  it("populates incoming and outgoing maps", () => {
    const dag = validateDag(
      [node("a"), node("b")],
      [{ from: "a", to: "b" }],
    );
    expect(dag.outgoing.get("a")).toHaveLength(1);
    expect(dag.incoming.get("b")).toHaveLength(1);
    expect(dag.incoming.get("a")).toHaveLength(0);
  });
});
