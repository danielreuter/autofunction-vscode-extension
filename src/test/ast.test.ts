import { _extractCompilerCalls, extractCompilerCalls } from "../ast";
import { assert, describe, it } from "vitest";

const desc = "ABC";

interface Description {
  value: string;
  regex: RegExp;
}

interface Call {
  start: string[];
  end: string[];
}

interface Scaffold {
  start: string[];
  end: string[];
}

const descriptions = [
  {
    value: `"ABC"`,
    regex: new RegExp(`ABC`),
  },
  {
    value: `'ABC'`,
    regex: new RegExp(`ABC`),
  },
  {
    value: `\`ABC\``,
    regex: new RegExp(`ABC`),
  },
  {
    value: `\`ABC\${desc}ABC\``,
    regex: new RegExp(`ABC.*ABC`),
  },
];

const calls = [
  {
    start: ["export const sum = compiler({"],
    end: ["  in: z.number().array(),", "  out: z.number(),", "});"],
  },
  {
    start: ["export const multiply = compiler({", "  in: z.number().array(),"],
    end: ["  out: z.number(),", "});"],
  },
  {
    start: [
      "const divide = compiler({",
      "  in: z.number().array(),",
      "  out: z.number(),",
    ],
    end: ["});"],
  },
];

const scaffolds = [
  {
    start: [
      "// This is a scaffold for the sum function",
      "function testSum() {",
      "  const result = sum([1, 2, 3]);",
      "  console.log(result);",
      "}",
    ],
    end: ["// End of test for sum function"],
  },
  {
    start: [
      "// This is a scaffold for the multiply function",
      "function testMultiply() {",
      "  const result = multiply([1, 2, 3]);",
      "  console.log(result);",
      "}",
    ],
    end: ["// End of test for multiply function"],
  },
  {
    start: [
      "// This is a scaffold for the divide function",
      "function testDivide() {",
      "  const result = divide([1, 2, 3]);",
      "  console.log(result);",
      "}",
    ],
    end: ["// End of test for divide function"],
  },
];

function createChunk(description: Description, call: Call) {
  return [
    call.start.join("\n"),
    "\tdo: " + description.value + ",",
    call.end.join("\n"),
  ].join("\n");
}

function createFixture(
  description: Description,
  call: Call,
  scaffold: Scaffold,
) {
  return [
    scaffold.start.join("\n"),
    createChunk(description, call),
    scaffold.end.join("\n"),
  ].join("\n");
}

const fixtures: string[] = [];
for (const desc of descriptions) {
  for (const call of calls) {
    for (const scaffold of scaffolds) {
      fixtures.push(createFixture(desc, call, scaffold));
    }
  }
}

describe("Test AST logic", () => {
  it("Test regexes should match the test value", () => {
    for (const desc of descriptions) {
      assert.strictEqual(desc.regex.test(desc.value), true);
    }
  });

  it("Test regexes should match fixture", () => {
    for (const desc of descriptions) {
      for (const call of calls) {
        for (const scaffold of scaffolds) {
          const fixture = createFixture(desc, call, scaffold);
          assert.strictEqual(desc.regex.test(fixture), true);
        }
      }
    }
  });

  it("Regexes extracted from code should be correct", () => {
    for (const desc of descriptions) {
      for (const call of calls) {
        for (const scaffold of scaffolds) {
          const chunk = createChunk(desc, call);
          const fixture = createFixture(desc, call, scaffold);
          const compilerCalls = _extractCompilerCalls(fixture);
          for (const call of compilerCalls) {
            assert.strictEqual(call.chunk.test(chunk), true);
            assert.strictEqual(call.description.test(desc.value), true);
            assert.strictEqual(
              call.description.toString(),
              desc.regex.toString(),
            );
          }
        }
      }
    }
  });
});
