import { describe, expect, mock, test } from "bun:test";

Bun.env.RESEND_API_KEY = "test-resend-key";
Bun.env.RESEND_FROM = "hello@waru.app";

const fetchMock = mock(async (..._args: any[]) => {
  return {
    ok: true,
    text: async () => "ok",
    json: async () => ({ id: "resend-id-123" }),
  } as Response;
});

globalThis.fetch = fetchMock as unknown as typeof fetch;

describe("Resend email provider", () => {
  test("sends email through Resend HTTP API", async () => {
    const { sendEmail } = await import("../src/utils/email/email");

    await expect(
      sendEmail({
        to: "user@example.com",
        subject: "Welcome",
        html: "<p>Hello</p>",
      }),
    ).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0];
    expect(call).toBeDefined();

    const [url, init] = call!;
    expect(String(url)).toBe("https://api.resend.com/emails");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toBeDefined();
  });
});
