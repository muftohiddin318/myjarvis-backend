import { executeTool } from "./executor.js";

export async function runBuiltinToolSelfTest() {
  const calculator = await executeTool("calculator", { expression: "12 * (4 + 3)" });
  const conversion = await executeTool("unit_convert", { value: 1, from: "km", to: "m" });
  const time = await executeTool("current_time", { timeZone: "Asia/Tashkent" });

  return {
    calculator: calculator.ok && (calculator.result as any)?.value === 84,
    conversion: conversion.ok && (conversion.result as any)?.value === 1000,
    time: time.ok
  };
}
