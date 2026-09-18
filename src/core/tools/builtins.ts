import type { ToolDefinition } from "./types.js";

const calculator: ToolDefinition<{ expression: string }, { value: number }> = {
  name: "calculator",
  description: "Evaluate a basic arithmetic expression using numbers, +, -, *, /, %, parentheses, and decimals.",
  risk: "read",
  status: "available",
  inputSchema: { type: "object", required: ["expression"], properties: { expression: { type: "string", maxLength: 200 } } },
  execute: ({ expression }) => {
    if (!/^[0-9+\-*/%.()\s]+$/.test(expression)) throw new Error("unsupported_expression");
    const tokens = expression.match(/\d+(?:\.\d+)?|[()+\-*/%]/g);
    if (!tokens || tokens.join("") !== expression.replace(/\s+/g, "")) throw new Error("invalid_expression");
    const values: number[] = [];
    const ops: string[] = [];
    const precedence: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2, "%": 2 };
    const apply = () => {
      const op = ops.pop();
      if (!op) throw new Error("invalid_expression");
      const b = values.pop(); const a = values.pop();
      if (a === undefined || b === undefined) throw new Error("invalid_expression");
      if (op === "/" && b === 0) throw new Error("division_by_zero");
      values.push(op === "+" ? a + b : op === "-" ? a - b : op === "*" ? a * b : op === "/" ? a / b : a % b);
    };
    for (const token of tokens) {
      if (/^\d/.test(token)) values.push(Number(token));
      else if (token === "(") ops.push(token);
      else if (token === ")") {
        while (ops.length && ops[ops.length - 1] !== "(") apply();
        if (ops.pop() !== "(") throw new Error("invalid_expression");
      } else {
        while (ops.length && ops[ops.length - 1] !== "(" && precedence[ops[ops.length - 1]] >= precedence[token]) apply();
        ops.push(token);
      }
    }
    while (ops.length) { if (ops[ops.length - 1] === "(") throw new Error("invalid_expression"); apply(); }
    if (values.length !== 1 || !Number.isFinite(values[0])) throw new Error("invalid_expression");
    return { value: values[0] };
  }
};

const currentTime: ToolDefinition<{ timeZone?: string }, { iso: string, timeZone: string }> = {
  name: "current_time",
  description: "Get the current date and time for an IANA timezone.",
  risk: "read",
  status: "available",
  inputSchema: { type: "object", properties: { timeZone: { type: "string" } } },
  execute: ({ timeZone = "UTC" }) => {
    const now = new Date();
    const iso = new Intl.DateTimeFormat("en-CA", { timeZone, dateStyle: "full", timeStyle: "long" }).format(now);
    return { iso, timeZone };
  }
};

const unitConvert: ToolDefinition<{ value: number, from: string, to: string }, { value: number }> = {
  name: "unit_convert",
  description: "Convert common length, mass, temperature, and data units.",
  risk: "read",
  status: "available",
  inputSchema: { type: "object", required: ["value","from","to"], properties: { value:{type:"number"}, from:{type:"string"}, to:{type:"string"} } },
  execute: ({ value, from, to }) => {
    const f=from.toLowerCase(), t=to.toLowerCase();
    const length: Record<string,number>={m:1,km:1000,cm:.01,mm:.001,mi:1609.344,ft:.3048,in:.0254};
    const mass: Record<string,number>={kg:1,g:.001,mg:.000001,lb:.45359237,oz:.028349523125};
    if (f==="c" || f==="°c" || f==="f" || f==="°f") {
      if (!["c","°c","f","°f"].includes(t)) throw new Error("incompatible_units");
      const c=f.includes("f")?(value-32)*5/9:value;
      return {value:t.includes("f")?c*9/5+32:c};
    }
    const table=length[f]!==undefined&&length[t]!==undefined?length:mass;
    if (table[f]===undefined || table[t]===undefined) throw new Error("unsupported_units");
    return {value:value*table[f]/table[t]};
  }
};

export const builtinTools = [calculator, currentTime, unitConvert];