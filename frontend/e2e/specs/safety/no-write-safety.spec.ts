import { test, expect } from "@playwright/test";
import { createHmac } from "node:crypto";
import { createServer, connect } from "node:net";
import { allowedQaRequest, installNoWriteNetworkGuard, BlockedRequestRecord, assertNoWriteViolations } from "../../guards/network-write.guard";
import { requireIsolatedQa } from "../../guards/environment.guard";
import { assertQaProfile } from "../../helpers/login";
import { rejectInherited, verifyIdentity, verifyResults, verifyContainer, verifyCleanup } from "../../qa/safety-policy.cjs";

test("unowned resources cannot be accepted or silently cleaned", () => {
  const own = {Config:{Labels:{"inktoy.qa.run":"qa"}},HostConfig:{NetworkMode:"none",Privileged:false,ReadonlyRootfs:true,CapDrop:["ALL"],SecurityOpt:["no-new-privileges"],PortBindings:{}},Mounts:[]};
  expect(()=>verifyContainer(own,"qa","none")).not.toThrow();
  expect(()=>verifyContainer(own,"other","none")).toThrow();
  expect(()=>verifyContainer({...own,HostConfig:{...own.HostConfig,NetworkMode:"host"}},"qa","none")).toThrow();
  expect(()=>verifyCleanup(["owned-container-remains"])).toThrow("QA_CLEANUP_FAILED:owned-container-remains");
});

test("unsafe inherited configuration is rejected", () => {
  for (const key of ["SPRING_DATASOURCE_URL", "DB_HOST", "E2E_ALLOW_WRITES", "E2E_ALLOW_STAGING", "E2E_BASE_URL", "E2E_QA_PASSWORD", "QA_MARKER"])
    expect(() => rejectInherited({ [key]: "unsafe" })).toThrow();
});
test("backend, datasource, marker, proxy and filter mismatch fail closed", () => {
  const expected = { runId: "qa", database: "db", systemId: "123" };
  const valid = { ...expected, dbUser: "db", markerMatched: true, ready: true, filter: "enforced", profile: "e2e-qa", pid: 1, proxyRunId: "qa" };
  expect(() => verifyIdentity(valid, expected, true)).not.toThrow();
  for (const key of ["runId", "database", "dbUser", "systemId", "markerMatched", "filter", "proxyRunId", "pid"])
    expect(() => verifyIdentity({ ...valid, [key]: "wrong" }, expected, true)).toThrow();
});
test("missing or skipped required tests cannot pass", () => {
  expect(() => verifyResults({ suites: [] })).toThrow();
  expect(() => verifyResults({ suites: [{ specs: [{ title: "omitted", tests: [{ status: "skipped", results: [{status:"skipped"}] }] }] }] })).toThrow();
});
test("occupied ports are rejected without killing their owner", async () => {
  const server = createServer(); await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as {port:number}).port;
  const contender = createServer();
  try {
    const code = await new Promise<string>(resolve => { contender.on("error", (e: NodeJS.ErrnoException) => resolve(e.code ?? "")); contender.listen(port,"127.0.0.1"); });
    expect(code).toBe("EADDRINUSE"); expect(server.listening).toBe(true);
  } finally { contender.close(); await new Promise<void>(resolve => server.close(() => resolve())); }
});
test("external origins and unsafe methods are denied", () => {
  expect(allowedQaRequest("GET", "http://127.0.0.1:4201/api/v1/auth/me")).toBe(true);
  for (const url of ["http://127.0.0.1:8080/api/v1/auth/me", "http://qa.invalid/api/v1/auth/me", "http://127.0.0.1:4201/api/unknown"])
    expect(allowedQaRequest("GET",url)).toBe(false);
  for (const method of ["POST","PUT","PATCH","DELETE","TRACE"])
    expect(allowedQaRequest(method,"http://127.0.0.1:4201/api/v1/sales")).toBe(false);
});
test("real browser guard blocks mutation and records failure evidence", async ({ context, page }) => {
  const blocked: BlockedRequestRecord[] = []; await installNoWriteNetworkGuard(context,blocked);
  await page.goto("/login");
  await page.evaluate(async () => { try { await fetch("/api/v1/sales",{method:"POST",body:"{}"}); } catch {} });
  expect(blocked.length).toBe(1); expect(blocked[0].reason).toBe("QA_REQUEST_DENIED");
  expect(()=>assertNoWriteViolations(blocked)).toThrow("QA_NO_WRITE_OR_AUTH_VIOLATION");
});
test("network boundary blocks controlled host and external decoys without Playwright routes", async () => {
  for (const [host, port] of [["127.0.0.1",Number(process.env.QA_HOST_DECOY_PORT)], [process.env.QA_DECOY_IP!,19090]] as const) {
    const reached = await new Promise<boolean>(resolve => { const socket=connect(port,host); socket.setTimeout(2000);
      socket.on("connect",()=>{socket.destroy();resolve(true);}); socket.on("error",()=>resolve(false)); socket.on("timeout",()=>{socket.destroy();resolve(false);}); });
    expect(reached).toBe(false);
  }
});
// These requests use only the attested QA origin. No independent arbitrary URL is accepted.
async function qaFetch(path: string, options: RequestInit = {}) {
  requireIsolatedQa();
  if (!["/api/v1/auth/login","/api/v1/auth/me","/api/v1/pos/products/search"].includes(path.split("?")[0])) throw new Error("QA_SAFETY_PATH_DENIED");
  return fetch("http://127.0.0.1:4201"+path,{...options,signal:AbortSignal.timeout(5000)});
}
test("invalid credentials fail real authentication", async () => {
  const response=await qaFetch("/api/v1/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({usernameOrEmail:process.env.E2E_QA_USER,password:"invalid-synthetic"})});
  expect(response.status).toBe(401);
});
test("real wrong-role user is rejected by QA precondition", async () => {
  const response=await qaFetch("/api/v1/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({usernameOrEmail:"denied_"+process.env.QA_RUN_ID,password:process.env.E2E_QA_PASSWORD})});
  expect(response.status).toBe(200); const data=await response.json();
  const me=await qaFetch("/api/v1/auth/me",{headers:{Authorization:"Bearer "+data.accessToken}});
  expect(me.status).toBe(200); const profile=await me.json(); expect(()=>assertQaProfile(profile)).toThrow("QA_IDENTITY_OR_ROLE_REJECTED");
});
test("expired signed QA session is rejected by real JWT validation", async () => {
  const encode=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString("base64url");
  const message=encode({alg:"HS512",typ:"JWT"})+"."+encode({sub:process.env.E2E_QA_USER,roles:["CAJERO"],iat:1,exp:2});
  const token=message+"."+createHmac("sha512",process.env.QA_JWT_SECRET!).update(message).digest("base64url");
  const response=await qaFetch("/api/v1/auth/me",{headers:{Authorization:"Bearer "+token}});expect(response.status).toBe(401);
});
test("missing synthetic product is a failed precondition", async () => {
  const response=await qaFetch("/api/v1/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({usernameOrEmail:process.env.E2E_QA_USER,password:process.env.E2E_QA_PASSWORD})});
  expect(response.status).toBe(200); const data=await response.json();
  const result=await qaFetch("/api/v1/pos/products/search?q=nonexistent-"+process.env.QA_RUN_ID,{headers:{Authorization:"Bearer "+data.accessToken}});
  expect(result.status).toBe(200); const products=await result.json();
  const rows=Array.isArray(products)?products:products.content;
  expect(rows).toEqual([]); expect(()=>{if(rows.length===0)throw new Error("QA_PRODUCT_MISSING");}).toThrow("QA_PRODUCT_MISSING");
});
