import { describe, expect, test, afterAll } from "bun:test";
import { usersService } from "../src/moduls/users/users.service";
import { db } from "../src/config/client";
import { ObjectId } from "mongodb";

describe("Users API Security & Password Exposure", () => {
  const service = new usersService();
  let createdUserId: string;

  const testUserPayload = {
    name: "Test Secure User",
    email: `secure_${Date.now()}@test.com`,
    password: "securepassword123",
    IsActive: true,
  };

  afterAll(async () => {
    // Cleanup users collection for test items
    await db.collection("users").deleteMany({
      email: { $regex: /^secure_.*@test.com$/ }
    });
  });

  test("create() encrypts password and does not leak it", async () => {
    const result = await service.create(testUserPayload);
    expect(result.acknowledged).toBe(true);
    expect(result.insertedId).toBeDefined();
    createdUserId = result.insertedId.toString();

    // Verify it is encrypted in DB
    const dbRecord = await db.collection("users").findOne({ _id: result.insertedId });
    expect(dbRecord).not.toBeNull();
    expect(dbRecord!.password).not.toBe(testUserPayload.password);
    expect(dbRecord!.password.startsWith("$")).toBe(true);
  });

  test("view() filters out password field from list", async () => {
    const response = await service.view({ page: "1", limit: "10" });
    expect(response.data.length).toBeGreaterThan(0);
    
    // Find the test user in returned list
    const returnedUser = response.data.find((u: any) => u._id.toString() === createdUserId);
    expect(returnedUser).toBeDefined();
    expect(returnedUser.password).toBeUndefined();
  });

  test("update() hashes password if provided and does not leak password in response", async () => {
    const updatePayload = {
      name: "Updated Secure User",
      password: "newsecurepassword456"
    };

    const updatedUser = await service.update(createdUserId, updatePayload);
    expect(updatedUser).toBeDefined();
    expect(updatedUser.name).toBe("Updated Secure User");
    expect(updatedUser.password).toBeUndefined();

    // Verify in DB that password was updated and is hashed
    const dbRecord = await db.collection("users").findOne({ _id: new ObjectId(createdUserId) });
    expect(dbRecord).not.toBeNull();
    expect(dbRecord!.password).not.toBe("newsecurepassword456");
    expect(dbRecord!.password.startsWith("$")).toBe(true);
  });

  test("delete() does not leak password in response", async () => {
    const deletedUser = await service.delete(createdUserId);
    expect(deletedUser).toBeDefined();
    expect(deletedUser.password).toBeUndefined();
  });
});