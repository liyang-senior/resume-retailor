import { parseAiJson } from "../src/lib/resume/parse-ai-json.js";

const cases = {
  ok: '{"a":["x","y"]}',
  innerQuote: '{"summary":["Built "real-time" pipelines, fast","two"],"t":"x"}',
  missingComma: '{"d":["one"\n"two"],"t":1}',
  rawNewline: '{"d":["line1\nline2"]}',
  trailing: '{"d":["a",],}',
  fenced: 'Here is the JSON:\n```json\n{"a":"b"}\n```',
  smart: "{\u201Ca\u201D:\u201Cb\u201D}",
  innerQuote2: '{"d":["Used 5" monitors, and "Redis", plus more","z"]}',
  truncatedClosers:
    '{"title":"T","summary":["a"],"skills":{"C":["x"]},"experience":[{"title":"E","details":["one","two later supported broader responsibilities."]}',
  truncatedMidString:
    '{"title":"T","summary":["a"],"skills":{"C":["x"]},"experience":[{"title":"E","details":["one","two cut off he',
  nested:
    '{"title":"T","summary":["a"],"skills":{"Cat":["x","y"]},"experience":[{"title":"E","details":["did "X" thing","other"]}]}',
};

let failed = 0;
for (const [k, v] of Object.entries(cases)) {
  try {
    console.log("PASS", k, JSON.stringify(parseAiJson(v)));
  } catch (e) {
    failed++;
    console.log("FAIL", k, e.message);
  }
}
process.exit(failed ? 1 : 0);
