import { expect, test } from "bun:test";
import { checkHostCompatibility } from "../src/compatibility";
import { getHostMetadata } from "../src/host-adapter";

test("real OMP 18.2.1 metadata satisfies the narrow host contract", () => {
  const host = getHostMetadata();

  expect(host.version).toBe("18.2.1");
  expect(checkHostCompatibility(host)).toEqual({ compatible: true });
});
