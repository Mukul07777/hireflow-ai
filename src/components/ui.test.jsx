import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  Btn, Card, Tag, MetricCard, ProgressBar, Spinner, Avatar,
  SkeletonLine, SkeletonCard, CandidateListSkeleton, ProspectListSkeleton, Toast,
} from "./ui.jsx";

// Component tests for the shared UI layer. These render real React output via
// react-dom/server (no new dependencies, no browser needed) and assert on the
// markup — enough to catch the failure modes that actually happen: a component
// that throws, a prop that stops being applied, or a variant that silently
// falls back to the wrong style.
const html = (el) => renderToStaticMarkup(el);

describe("Btn", () => {
  it("renders its children", () => {
    expect(html(<Btn>Save changes</Btn>)).toContain("Save changes");
  });
  it("applies the disabled attribute", () => {
    expect(html(<Btn disabled>Go</Btn>)).toContain("disabled");
  });
  it("renders distinct styling per variant", () => {
    const primary = html(<Btn variant="primary">A</Btn>);
    const danger = html(<Btn variant="danger">A</Btn>);
    expect(primary).not.toBe(danger);
  });
  it("falls back to the secondary variant for an unknown variant", () => {
    const unknown = html(<Btn variant="does-not-exist">A</Btn>);
    const secondary = html(<Btn variant="secondary">A</Btn>);
    expect(unknown).toBe(secondary);
  });
  it("stretches when fullWidth is set", () => {
    expect(html(<Btn fullWidth>A</Btn>)).toContain("width:100%");
  });
});

describe("Card", () => {
  it("renders children and merges custom style overrides", () => {
    const out = html(<Card style={{ padding: 40 }}>Inside</Card>);
    expect(out).toContain("Inside");
    expect(out).toContain("padding:40px");
  });
});

describe("Tag", () => {
  it("renders the label", () => {
    expect(html(<Tag>Beta</Tag>)).toContain("Beta");
  });
  it("uses a different colour per semantic type", () => {
    expect(html(<Tag color="success">x</Tag>)).not.toBe(html(<Tag color="danger">x</Tag>));
  });
  it("falls back to neutral for an unknown colour", () => {
    expect(html(<Tag color="nope">x</Tag>)).toBe(html(<Tag color="neutral">x</Tag>));
  });
});

describe("ProgressBar", () => {
  it("renders the given percentage width", () => {
    expect(html(<ProgressBar value={42} />)).toContain("width:42%");
  });
  it("clamps out-of-range values instead of producing invalid CSS", () => {
    expect(html(<ProgressBar value={150} />)).toContain("width:100%");
    expect(html(<ProgressBar value={-20} />)).toContain("width:0%");
  });
  it("treats a missing value as zero rather than NaN", () => {
    const out = html(<ProgressBar />);
    expect(out).toContain("width:0%");
    expect(out).not.toContain("NaN");
  });
});

describe("MetricCard", () => {
  it("renders label and value", () => {
    const out = html(<MetricCard label="Candidates" value={12} />);
    expect(out).toContain("Candidates");
    expect(out).toContain("12");
  });
  it("omits the delta line when no delta is given", () => {
    expect(html(<MetricCard label="A" value={1} />)).not.toContain("undefined");
  });
});

describe("Avatar", () => {
  it("renders initials and respects the size prop", () => {
    const out = html(<Avatar initials="MK" bg="#000" textColor="#fff" size={48} />);
    expect(out).toContain("MK");
    expect(out).toContain("width:48px");
  });
});

describe("skeletons and spinner render without throwing", () => {
  it("SkeletonLine / SkeletonCard / lists / Spinner", () => {
    expect(html(<SkeletonLine />)).toContain("div");
    expect(html(<SkeletonCard lines={2} />)).toContain("div");
    expect(html(<CandidateListSkeleton />)).toContain("div");
    expect(html(<ProspectListSkeleton />)).toContain("div");
    expect(html(<Spinner />)).toContain("div");
  });
});

describe("Toast", () => {
  it("renders the message", () => {
    expect(html(<Toast msg="Saved" type="success" onClose={() => {}} />)).toContain("Saved");
  });
  it("renders every supported type without throwing", () => {
    for (const t of ["success", "error", "info", "warn", "unknown"]) {
      expect(html(<Toast msg="m" type={t} onClose={() => {}} />)).toContain("m");
    }
  });
});
