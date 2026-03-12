/**
 * Sanitize errors for logging — strips massive Prisma internals
 * that flood the terminal with minified client source code.
 *
 * Usage: console.error("Something failed:", sanitizeError(error))
 */
export function sanitizeError(error) {
    if (!error || typeof error !== "object") return error;

    const name = error?.constructor?.name || error?.name || "Error";

    // Prisma errors include the entire invocation + minified client in .message
    const isPrismaError = name.startsWith("PrismaClient");

    return {
        name,
        // Trim Prisma messages (can be 50KB+) to something useful
        message: isPrismaError
            ? (error.message?.split("\n")?.slice(0, 5)?.join("\n") || "Unknown Prisma error")
            : (error.message || String(error)),
        ...(error.code && { code: error.code }),
        ...(error.meta && { meta: error.meta }),
        ...(error.status && { status: error.status }),
    };
}
