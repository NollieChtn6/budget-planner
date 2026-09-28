const ENTER = new Set(["\n", "\r"]);
const BACKSPACE = new Set([String.fromCharCode(127), "\b"]);
const CTRL_C = String.fromCharCode(3);
const CTRL_D = String.fromCharCode(4);

/**
 * Prompts for a value without echoing it to the terminal (used for
 * passwords, per ADR-0008 - never a CLI argument or env var).
 */
export function promptHidden(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const { stdin } = process;
    process.stdout.write(question);

    const wasRaw = stdin.isRaw ?? false;
    stdin.resume();
    stdin.setRawMode?.(true);
    stdin.setEncoding("utf8");

    let input = "";
    let done = false;
    const cleanup = () => {
      stdin.setRawMode?.(wasRaw);
      stdin.pause();
      stdin.removeListener("data", onChunk);
      stdin.removeListener("end", onEnd);
    };
    const onEnd = () => {
      if (done) return;
      done = true;
      cleanup();
      reject(new Error("stdin closed before the password was entered."));
    };
    const onChunk = (chunk: string) => {
      for (const char of chunk) {
        if (done) return;
        if (ENTER.has(char) || char === CTRL_D) {
          done = true;
          cleanup();
          process.stdout.write("\n");
          resolve(input);
          return;
        }
        if (char === CTRL_C) {
          done = true;
          cleanup();
          process.stdout.write("\n");
          reject(new Error("Aborted."));
          return;
        }
        if (BACKSPACE.has(char)) {
          input = input.slice(0, -1);
          continue;
        }
        input += char;
      }
    };

    stdin.on("data", onChunk);
    stdin.on("end", onEnd);
  });
}
