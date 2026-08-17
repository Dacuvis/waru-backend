// Menggunakan Bun.password yang built-in — bcrypt compatible, tanpa library tambahan
export async function hashPassword(password: string): Promise<string> {
  return await Bun.password.hash(password, {
    algorithm: "bcrypt",
    cost: 10,
  });
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  return await Bun.password.verify(plain, hashed);
}
