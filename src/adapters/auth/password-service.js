import bcrypt from "bcryptjs";

export async function hashPassword(value) {
  return bcrypt.hash(value, 12);
}

export async function verifyPassword(value, hash) {
  return bcrypt.compare(value, hash);
}
