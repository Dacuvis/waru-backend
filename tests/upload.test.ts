import { describe, expect, test } from "bun:test";
import { Elysia, t } from "elysia";
import { uploadSingleValidation, uploadMultipleValidation, uploadQueryValidation } from "../src/moduls/upload/upload.validation";
import { existsSync } from "node:fs";
import { unlink } from "node:fs/promises";

describe("Upload Module Validation & Static Serving", () => {
  test("validates single file upload schema with Elysia", async () => {
    const app = new Elysia().post(
      "/test-upload",
      ({ body }: { body: { file: File } }) => {
        return {
          name: body.file.name,
          size: body.file.size,
          type: body.file.type,
        };
      },
      uploadSingleValidation,
    );

    const formData = new FormData();
    const blob = new Blob(["hello world content"], { type: "text/plain" });
    formData.append("file", blob, "hello.txt");

    const response = await app.handle(
      new Request("http://localhost/test-upload", {
        method: "POST",
        body: formData,
      }),
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.name).toBe("hello.txt");
    expect(json.size).toBe(19);
    expect(json.type).toContain("text/plain");
  });

  test("serves public static files via Bun.file", async () => {
    const testFilePath = "public/uploads/test-static-file.txt";
    await Bun.write(testFilePath, "test public static content");

    const app = new Elysia().get("/public/*", async ({ params, set }) => {
      const filePath = `public/${params["*"]}`;
      const file = Bun.file(filePath);
      if (!(await file.exists())) {
        set.status = 404;
        return { error: "Not found" };
      }
      return file;
    });

    const response = await app.handle(
      new Request("http://localhost/public/uploads/test-static-file.txt"),
    );

    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toBe("test public static content");

    // Clean up test file
    if (existsSync(testFilePath)) {
      await unlink(testFilePath);
    }
  });

  test("returns 404 for non-existent public files", async () => {
    const app = new Elysia().get("/public/*", async ({ params, set }) => {
      const filePath = `public/${params["*"]}`;
      const file = Bun.file(filePath);
      if (!(await file.exists())) {
        set.status = 404;
        return { error: "File tidak ditemukan." };
      }
      return file;
    });

    const response = await app.handle(
      new Request("http://localhost/public/uploads/non-existent-file.txt"),
    );

    expect(response.status).toBe(404);
  });
});
