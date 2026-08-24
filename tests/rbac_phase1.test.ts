import { describe, expect, test, afterAll, mock } from "bun:test";
import { RegisterService } from "../src/moduls/register/register.service";
import { LoginService } from "../src/moduls/login/login.service";
import { db } from "../src/config/client";

mock.module("../src/utils/email/email", () => ({
  sendEmail: mock(() => Promise.resolve()),
  loginEmailTemplate: mock(() => "HTML"),
  welcomeEmailTemplate: mock(() => "HTML"),
}));

describe("RBAC Phase 1 - Authentication & Role Assignment", () => {
  const registerService = new RegisterService();
  const loginService = new LoginService();
  
  const testEmail = `rbac_test_${Date.now()}@test.com`;
  const legacyEmail = `legacy_${Date.now()}@test.com`;
  const password = "securepassword123";
  
  let registeredUserId: string;

  // Mock signFn and context
  const mockSignFn = async (payload: any) => JSON.stringify(payload);
  const mockCtx = {
    cookie: {},
  } as any;

  afterAll(async () => {
    await db.collection("users").deleteMany({
      email: { $in: [testEmail, legacyEmail] }
    });
  });

  test("New registration creates a user with role 'customer' and JWT payload includes role but no password", async () => {
    // Attempting to pass role via a hijacked process (e.g. if the caller somehow passed it, though register() signature doesn't even accept it)
    const res = await registerService.register("Test RBAC User", testEmail, password, mockSignFn, mockCtx);
    
    expect(res.message).toContain("berhasil");
    expect(res.token).toBeDefined();
    
    // Check JWT Payload
    const decodedToken = JSON.parse(res.token);
    expect(decodedToken.id).toBeDefined();
    expect(decodedToken.email).toBe(testEmail);
    expect(decodedToken.role).toBe("customer");
    expect(decodedToken.password).toBeUndefined();
    
    registeredUserId = decodedToken.id;

    // Verify in DB that role is customer
    const dbRecord = await db.collection("users").findOne({ email: testEmail });
    expect(dbRecord).not.toBeNull();
    expect(dbRecord!.role).toBe("customer");
  });

  test("Login returns JWT with stored role", async () => {
    const res = await loginService.login(testEmail, password, mockSignFn, mockCtx);
    
    expect(res.token).toBeDefined();
    const decodedToken = JSON.parse(res.token);
    expect(decodedToken.role).toBe("customer");
    expect(decodedToken.email).toBe(testEmail);
    expect(decodedToken.password).toBeUndefined();
  });

  test("Legacy users without a role fallback to 'customer' on login", async () => {
    // Create a legacy user directly in DB without a role
    const hashPassword = await Bun.password.hash(password);
    await db.collection("users").insertOne({
      name: "Legacy User",
      email: legacyEmail,
      password: hashPassword,
      createdAt: new Date(),
      // no role field
    });
    
    const res = await loginService.login(legacyEmail, password, mockSignFn, mockCtx);
    
    expect(res.token).toBeDefined();
    const decodedToken = JSON.parse(res.token);
    
    // The fallback logic should provide 'customer' safely
    expect(decodedToken.role).toBe("customer");
    expect(decodedToken.email).toBe(legacyEmail);
  });
});