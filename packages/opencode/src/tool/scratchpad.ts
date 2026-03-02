import z from "zod"
import { Tool } from "./tool"
import { Instance } from "../project/instance"
import { Filesystem } from "../util/filesystem"
import path from "path"
import fs from "fs/promises"

const SCRATCHPAD_FILE = ".opencode/scratchpad.md"

export const ScratchpadTool = Tool.define("scratchpad", {
  description:
    "A short-term memory notepad for the CURRENT task. Use this to store facts, constraints, discovered patterns, or lessons (e.g., 'Tried standard fs, must use Bun.file()', 'The main layout uses Grid'). Sub-agents and the main agent should read/write to this.",
  parameters: z.object({
    action: z
      .enum(["add", "read", "clear"])
      .describe("Whether to add a fact, read the entire scratchpad, or clear it when starting a new major task"),
    fact: z.string().optional().describe("The fact or lesson to store (only used when action='add')"),
  }),
  async execute(params, ctx) {
    await ctx.ask({
      permission: "scratchpad",
      patterns: ["*"],
      always: ["*"],
      metadata: {},
    })

    const root = Instance.directory
    const opencodeDir = path.join(root, ".opencode")
    const filepath = path.join(root, SCRATCHPAD_FILE)

    // Ensure .opencode exists
    try {
      await fs.mkdir(opencodeDir, { recursive: true })
    } catch (e) {}

    if (params.action === "read") {
      try {
        const content = await Filesystem.readText(filepath)
        return {
          title: "Read scratchpad",
          output: content || "The scratchpad is currently empty.",
          metadata: { action: "read", filepath } as Record<string, any>,
        }
      } catch (e) {
        return {
          title: "Read scratchpad",
          output: "The scratchpad is currently empty.",
          metadata: { action: "read", filepath } as Record<string, any>,
        }
      }
    }

    if (params.action === "clear") {
      await fs.writeFile(filepath, "", "utf-8")
      return {
        title: "Cleared scratchpad",
        output: "The short-term task scratchpad has been completely cleared.",
        metadata: { action: "clear", filepath } as Record<string, any>,
      }
    }

    if (params.action === "add" && params.fact) {
      let content = ""
      try {
        content = await Filesystem.readText(filepath)
      } catch (e) {}

      const newEntry = `- ${params.fact}\n`
      if (!content.includes(params.fact)) {
        await fs.writeFile(filepath, content + newEntry, "utf-8")
      }

      return {
        title: "Added to scratchpad",
        output: `Successfully stored the fact in the short-term scratchpad: "${params.fact}"`,
        metadata: { action: "add", fact: params.fact, filepath } as Record<string, any>,
      }
    }

    return {
      title: "Invalid action",
      output: "You must provide a valid action: 'read', 'clear', or 'add' (with a fact).",
      metadata: { action: params.action } as Record<string, any>,
    }
  },
})
