import z from "zod"
import { Tool } from "./tool"
import { Filesystem } from "../util/filesystem"
import { Instance } from "../project/instance"
import path from "path"
import fs from "fs/promises"

const MEMORY_FILE = "AGENTS.md"

export const MemoryTool = Tool.define("memory", {
  description:
    "Save a long-term fact, preference, or rule about this project that should persist across all future sessions. Use this for global conventions (e.g., 'Always use Tailwind', 'The database is SQLite').",
  parameters: z.object({
    fact: z.string().describe("The rule, preference, or fact to save to the project's long-term memory (AGENTS.md)"),
  }),
  async execute(params, ctx) {
    await ctx.ask({
      permission: "memory",
      patterns: ["*"],
      always: ["*"],
      metadata: {},
    })

    const root = Instance.directory
    const filepath = path.join(root, MEMORY_FILE)

    let content = ""
    try {
      content = await Filesystem.readText(filepath)
    } catch (e) {
      // File doesn't exist yet, which is fine
    }

    const newEntry = `- ${params.fact}\n`
    if (content.includes(params.fact)) {
      return {
        title: "Memory already exists",
        output: `The fact "${params.fact}" is already in the project's long-term memory.`,
        metadata: { filepath, fact: params.fact } as Record<string, any>,
      }
    }

    await fs.writeFile(filepath, content + newEntry, "utf-8")

    return {
      title: "Saved to long-term memory",
      output: `Successfully saved "${params.fact}" to ${MEMORY_FILE}. This will be loaded in all future sessions.`,
      metadata: { filepath, fact: params.fact } as Record<string, any>,
    }
  },
})
