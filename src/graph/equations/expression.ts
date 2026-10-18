type Node =
  | { kind: "number"; value: number }
  | { kind: "x" }
  | { kind: "unary"; op: string; value: Node }
  | { kind: "binary"; op: string; left: Node; right: Node }
  | { kind: "call"; name: string; value: Node };
const functions = new Map<string, (x: number) => number>([
  ["sin", Math.sin],
  ["cos", Math.cos],
  ["tan", Math.tan],
  ["sqrt", Math.sqrt],
  ["abs", Math.abs],
  ["ln", Math.log],
  ["log", Math.log],
  ["log10", Math.log10],
  ["exp", Math.exp],
]);
const precedence: Record<string, number> = {
  "+": 1,
  "-": 1,
  "*": 2,
  "/": 2,
  "^": 4,
};
/** Deliberately small arithmetic grammar. No JavaScript evaluation or property access. */
export function compileExpression(input: string): (x: number) => number {
  if (input.length > 512)
    throw new Error("Keep each equation under 512 characters.");
  const source = input
    .trim()
    .replace(/^y\s*=\s*/i, "")
    .replaceAll("²", "^2")
    .replaceAll("³", "^3")
    .replaceAll("−", "-")
    .replaceAll("π", "pi");
  if (!source) throw new Error("Enter an expression, such as y = x^2.");
  const raw: string[] = [];
  let offset = 0;
  while (offset < source.length) {
    if (/\s/.test(source[offset])) {
      offset++;
      continue;
    }
    const match =
      /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|^[a-zA-Z][a-zA-Z0-9]*|^[-+*/^()]/.exec(
        source.slice(offset),
      );
    if (!match)
      throw new Error(
        `Unsupported character: ${source[offset]}. Use y = f(x) with arithmetic and supported functions.`,
      );
    raw.push(match[0]);
    offset += match[0].length;
  }
  const isNumber = (s: string) => /^(?:\d|\.)/.test(s);
  const isSymbol = (s: string) => ["x", "pi", "e"].includes(s);
  const tokens: string[] = [];
  raw.forEach((token, index) => {
    const previous = raw[index - 1];
    if (
      previous &&
      (isNumber(previous) || isSymbol(previous) || previous === ")") &&
      (isNumber(token) || /^[a-zA-Z]/.test(token) || token === "(")
    )
      tokens.push("*");
    tokens.push(token);
  });
  let position = 0,
    nodes = 0;
  function parse(minimum = 0, depth = 0): Node {
    if (depth > 32 || ++nodes > 128)
      throw new Error(
        "This equation is too complex. Simplify it and try again.",
      );
    const token = tokens[position++];
    let node: Node;
    if (token === "+" || token === "-")
      node = { kind: "unary", op: token, value: parse(3, depth + 1) };
    else if (token === "(") {
      node = parse(0, depth + 1);
      if (tokens[position++] !== ")")
        throw new Error("Close each opening parenthesis.");
    } else if (token && isNumber(token)) {
      const value = Number(token);
      if (!Number.isFinite(value)) throw new Error("Use finite numbers.");
      node = { kind: "number", value };
    } else if (token === "x") node = { kind: "x" };
    else if (token === "pi" || token === "e")
      node = { kind: "number", value: token === "pi" ? Math.PI : Math.E };
    else if (functions.has(token)) {
      if (tokens[position++] !== "(")
        throw new Error(`Use parentheses, such as ${token}(x).`);
      node = { kind: "call", name: token, value: parse(0, depth + 1) };
      if (tokens[position++] !== ")")
        throw new Error("Close each opening parenthesis.");
    } else
      throw new Error(
        token
          ? `Unsupported symbol: ${token}. Use x as the variable.`
          : "Finish the expression.",
      );
    while (position < tokens.length) {
      const op = tokens[position],
        power = precedence[op];
      if (power === undefined || power < minimum) break;
      position++;
      node = {
        kind: "binary",
        op,
        left: node,
        right: parse(op === "^" ? power : power + 1, depth + 1),
      };
    }
    return node;
  }
  const tree = parse();
  if (position !== tokens.length)
    throw new Error("Check the operators and parentheses.");
  function evaluate(node: Node, x: number): number {
    if (node.kind === "number") return node.value;
    if (node.kind === "x") return x;
    if (node.kind === "unary")
      return (node.op === "-" ? -1 : 1) * evaluate(node.value, x);
    if (node.kind === "call")
      return functions.get(node.name)!(evaluate(node.value, x));
    const a = evaluate(node.left, x),
      b = evaluate(node.right, x);
    switch (node.op) {
      case "+":
        return a + b;
      case "-":
        return a - b;
      case "*":
        return a * b;
      case "/":
        return a / b;
      default:
        return a ** b;
    }
  }
  return (x) => evaluate(tree, x);
}
