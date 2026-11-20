import { describe, expect, it } from "vitest";
import { parseCsv, parseJson, parseUploadFile, UploadParseError } from "./parseUpload";

function fakeFile(name: string, content: string, size = content.length): File {
  return {
    name,
    size,
    text: async () => content,
  } as unknown as File;
}

describe("parseCsv", () => {
  it("parses a valid CSV with all columns", () => {
    const rows = parseCsv(
      "pid,arrival,burst,priority\nP1,0,5,1\nP2,1,3,2\nP3,2,8,3\nP4,3,6,4\n",
    );
    expect(rows).toEqual([
      { pid: "P1", arrival: "0", burst: "5", priority: "1" },
      { pid: "P2", arrival: "1", burst: "3", priority: "2" },
      { pid: "P3", arrival: "2", burst: "8", priority: "3" },
      { pid: "P4", arrival: "3", burst: "6", priority: "4" },
    ]);
  });

  it("defaults a missing priority column to zero", () => {
    const rows = parseCsv("pid,arrival,burst\nA,0,2\nB,2,4\n");
    expect(rows).toEqual([
      { pid: "A", arrival: "0", burst: "2", priority: "0" },
      { pid: "B", arrival: "2", burst: "4", priority: "0" },
    ]);
  });

  it("ignores blank lines and trims whitespace", () => {
    const rows = parseCsv(
      "\n  PID , Arrival , Burst , Priority \n\n  P1 , 0 , 5 , 1 \n\nP2,1,2,0\n\n",
    );
    expect(rows).toEqual([
      { pid: "P1", arrival: "0", burst: "5", priority: "1" },
      { pid: "P2", arrival: "1", burst: "2", priority: "0" },
    ]);
  });

  it("supports quoted values and escaped quotes", () => {
    const rows = parseCsv('pid,arrival,burst,priority\n"P,1",0,2,0\n"say ""hi""",1,1,0\n');
    expect(rows).toEqual([
      { pid: "P,1", arrival: "0", burst: "2", priority: "0" },
      { pid: 'say "hi"', arrival: "1", burst: "1", priority: "0" },
    ]);
  });

  it("reports a missing required column", () => {
    expect(() => parseCsv("pid,burst\nP1,5\n")).toThrow(
      new UploadParseError("Missing required column: arrival."),
    );
  });

  it("reports a missing value with its line number", () => {
    expect(() => parseCsv("pid,arrival,burst\nP1,0,5\nP2,1,\n")).toThrow(
      new UploadParseError("Row 3: missing value for 'burst'."),
    );
  });

  it("reports a non-numeric value", () => {
    expect(() => parseCsv("pid,arrival,burst\nP1,soon,5\n")).toThrow(
      new UploadParseError("Row 2: 'arrival' must be a number."),
    );
  });

  it("reports a malformed priority value", () => {
    expect(() => parseCsv("pid,arrival,burst,priority\nP1,0,5,high\n")).toThrow(
      new UploadParseError("Row 2: 'priority' must be a number."),
    );
  });

  it("reports an empty file", () => {
    expect(() => parseCsv("  \n\n")).toThrow(new UploadParseError("The file is empty."));
  });

  it("reports a header with no data rows", () => {
    expect(() => parseCsv("pid,arrival,burst\n")).toThrow(
      new UploadParseError("The file does not contain any process rows."),
    );
  });

  it("reports duplicate columns", () => {
    expect(() => parseCsv("pid,arrival,burst,pid\nP1,0,1,P2\n")).toThrow(
      new UploadParseError("The header contains duplicate columns."),
    );
  });

  it("reports extra values", () => {
    expect(() => parseCsv("pid,arrival,burst\nP1,0,1,extra\n")).toThrow(
      new UploadParseError("Row 2: expected 3 columns but found 4."),
    );
  });
});

describe("parseJson", () => {
  it("parses a valid JSON array", () => {
    const rows = parseJson(
      JSON.stringify([
        { pid: "P1", arrival: 0, burst: 5, priority: 1 },
        { pid: "P2", arrival: 1, burst: 3 },
      ]),
    );
    expect(rows).toEqual([
      { pid: "P1", arrival: "0", burst: "5", priority: "1" },
      { pid: "P2", arrival: "1", burst: "3", priority: "0" },
    ]);
  });

  it("reports malformed JSON", () => {
    expect(() => parseJson('[{"pid":')).toThrow(
      new UploadParseError("File is not valid JSON."),
    );
  });

  it("reports a non-array document", () => {
    expect(() => parseJson('{"pid":"P1"}')).toThrow(
      new UploadParseError("The JSON file must contain an array of process objects."),
    );
  });

  it("reports an empty array", () => {
    expect(() => parseJson("[]")).toThrow(
      new UploadParseError("The file does not contain any process rows."),
    );
  });

  it("reports an item that is not an object", () => {
    expect(() => parseJson('["P1"]')).toThrow(
      new UploadParseError("Item 1: expected an object with pid, arrival, and burst."),
    );
  });

  it("reports a missing field", () => {
    expect(() => parseJson('[{"pid":"P1","arrival":0}]')).toThrow(
      new UploadParseError("Item 1: missing value for 'burst'."),
    );
  });

  it("reports a non-numeric field", () => {
    expect(() => parseJson('[{"pid":"P1","arrival":"0","burst":5}]')).toThrow(
      new UploadParseError("Item 1: 'arrival' must be a number."),
    );
  });

  it("reports a non-text pid", () => {
    expect(() => parseJson('[{"pid":1,"arrival":0,"burst":5}]')).toThrow(
      new UploadParseError("Item 1: 'pid' must be text."),
    );
  });

  it("reports a blank pid", () => {
    expect(() => parseJson('[{"pid":"  ","arrival":0,"burst":5}]')).toThrow(
      new UploadParseError("Item 1: missing value for 'pid'."),
    );
  });

  it("reports an invalid priority type", () => {
    expect(() =>
      parseJson('[{"pid":"P1","arrival":0,"burst":5,"priority":"high"}]'),
    ).toThrow(new UploadParseError("Item 1: 'priority' must be a number."));
  });
});

describe("parseUploadFile", () => {
  it("rejects unsupported file types", async () => {
    await expect(parseUploadFile(fakeFile("data.txt", "pid,arrival,burst"))).rejects.toThrow(
      new UploadParseError("Unsupported file type. Upload a .csv or .json file."),
    );
  });

  it("rejects files larger than 1 MB", async () => {
    await expect(
      parseUploadFile(fakeFile("data.csv", "pid,arrival,burst", 1024 * 1024 + 1)),
    ).rejects.toThrow(new UploadParseError("File is too large. The maximum size is 1 MB."));
  });

  it("dispatches to the CSV parser by extension", async () => {
    const rows = await parseUploadFile(fakeFile("data.CSV", "pid,arrival,burst\nP1,0,2\n"));
    expect(rows).toEqual([{ pid: "P1", arrival: "0", burst: "2", priority: "0" }]);
  });

  it("dispatches to the JSON parser by extension", async () => {
    const rows = await parseUploadFile(
      fakeFile("data.json", '[{"pid":"P1","arrival":0,"burst":2}]'),
    );
    expect(rows).toEqual([{ pid: "P1", arrival: "0", burst: "2", priority: "0" }]);
  });
});
