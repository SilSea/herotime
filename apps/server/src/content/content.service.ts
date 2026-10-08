import { Injectable, Logger } from "@nestjs/common";
import { Content } from "@herotime/engine";
import { getContentSet, getRawContentSet, withGeneratedText, type ContentSetData } from "@herotime/content";
import { CardDef, ContentRules, FactionDef, GaugeDef, HeroDef, RelicDef, SeriesDef, SoundsDef } from "@herotime/shared";
import { z } from "zod";
import { logInternal } from "../errors.js";
import type { ContentData, ContentRepository } from "../persistence/repositories.js";

export const ContentFile = z.object({
  factions: z.array(FactionDef).default([]),
  cards: z.array(CardDef),
  series: z.array(SeriesDef).default([]),
  gauges: z.array(GaugeDef).default([]),
  relics: z.array(RelicDef).default([]),
  heroes: z.array(HeroDef).default([]),
  rules: ContentRules.optional(),
  sounds: SoundsDef.optional(),
});

export interface Inspection {
  /** Every problem found; empty means the content can be played. */
  issues: string[];
  /** The cleaned data as authored (no generated rules text), when it parsed. */
  data?: ContentSetData;
  /** Ready for the engine, when there are no issues. */
  content?: Content;
}

const contentLog = new Logger("Content");

/** Check content JSON without throwing: all problems listed, so an editor can show them at once. */
export function inspectContent(raw: unknown): Inspection {
  const parsed = ContentFile.safeParse(raw);
  if (!parsed.success) return { issues: parsed.error.issues.map((i) => `${i.path.join(".") || "content"}: ${i.message}`) };
  const data = parsed.data as ContentSetData;

  let content: Content;
  try {
    content = new Content(withGeneratedText(data)); // throws on dangling references
  } catch (e) {
    // Content checks throw "invalid content: ..." (or "duplicate ... key") with readable problems; anything else is a bug, kept in the log.
    const text = e instanceof Error ? e.message : String(e);
    if (!/^(invalid content:|duplicate )/.test(text)) return { data, issues: [logInternal(contentLog, "checking content", e)] };
    return { data, issues: text.replace(/^invalid content:\s*/, "").split(/\n- ?|\n/).map((s) => s.replace(/^- /, "").trim()).filter(Boolean) };
  }
  const issues: string[] = [];
  if (content.heroes.size < 2) issues.push("content needs at least 2 heroes");
  if (![...content.cards.values()].some((c) => c.kind === "UNIT" && !c.token)) issues.push("content needs at least one shop unit");
  return issues.length > 0 ? { data, issues } : { data, issues, content };
}

/** Parse and cross-check content JSON. Throws with every problem listed if it is not playable. */
export function parseContent(raw: unknown): Content {
  const r = inspectContent(raw);
  if (!r.content) throw new Error(r.issues.join("\n"));
  return r.content;
}

/** Everything the web client needs to draw cards, as plain JSON. */
export function snapshotOf(c: Content, set: string, version: number): Record<string, unknown> {
  return {
    set,
    version,
    factions: [...c.factions.values()],
    series: [...c.series.values()],
    cards: [...c.cards.values()],
    gauges: [...c.gauges.values()],
    relics: [...c.relics.values()],
    heroes: [...c.heroes.values()],
    rules: { ...c.rules },
    sounds: c.sounds,
  };
}

export class ContentInvalidError extends Error {
  constructor(readonly issues: string[]) {
    super(`content is not playable:\n- ${issues.join("\n- ")}`);
    this.name = "ContentInvalidError";
  }
}

/**
 * Holds the content new matches are built from: the latest published version. A running match keeps the
 * Content it started with, so publishing never changes a game in progress.
 */
@Injectable()
export class ContentService {
  private current: Content;
  private version = 1;
  /** The latest version as authored (no generated text), when known. */
  private data: ContentSetData | undefined;
  /** Versions already built, so a player still in an older match can be shown that match's cards. */
  private readonly built = new Map<number, Content>();

  /** The set this service was configured with: what seeding publishes, whatever is loaded since. */
  private readonly seedContent: Content;
  private readonly seedData: ContentSetData;

  constructor(content: Content, readonly setName = "custom", data?: ContentSetData) {
    this.current = content;
    this.data = data;
    this.seedContent = content;
    this.seedData = data ?? this.authored();
    this.built.set(1, content);
  }

  /** Build from a named set in @herotime/content ("prototype", "production"). */
  static fromSet(name: string): ContentService {
    return new ContentService(parseContent(getContentSet(name)), name, getRawContentSet(name));
  }

  /**
   * Make the repository the source of truth: load its newest published version, or (empty repository, or
   * `reseed`) publish the configured set as a new version. Returns what happened.
   */
  async restore(repo: ContentRepository, reseed = false): Promise<"loaded" | "seeded"> {
    const latest = await repo.latest();
    if (latest && !reseed) {
      const r = inspectContent(latest.data);
      if (!r.content || !r.data) throw new Error(`stored content version ${latest.number} is not playable:\n- ${r.issues.join("\n- ")}`);
      this.use(r.content, r.data, latest.number);
      return "loaded";
    }
    const record = await repo.publish(this.seedData as unknown as ContentData, latest ? `reseeded from "${this.setName}"` : `initial content: "${this.setName}"`, null);
    this.use(this.seedContent, this.seedData, record.number);
    return "seeded";
  }

  get latest(): { content: Content; version: number } {
    return { content: this.current, version: this.version };
  }

  snapshot(): Record<string, unknown> {
    return snapshotOf(this.current, this.setName, this.version);
  }

  /** The cards of an older (or the current) version, for a client that is still in a match started with it. */
  async snapshotAt(repo: ContentRepository | undefined, version: number): Promise<Record<string, unknown> | undefined> {
    if (version === this.version) return this.snapshot();
    let content = this.built.get(version);
    if (!content && repo) {
      const record = await repo.get(version);
      const r = record ? inspectContent(record.data) : undefined;
      if (r?.content) this.built.set(version, (content = r.content));
    }
    return content && snapshotOf(content, this.setName, version);
  }

  /** The newest published version as authored, or (when the service was built from a bare Content) rebuilt from it. */
  authored(): ContentSetData {
    if (this.data) return this.data;
    const { set: _s, version: _v, ...rest } = this.snapshot();
    return rest as unknown as ContentSetData;
  }

  /** Validate, store as the next version, and switch new matches over to it. Throws ContentInvalidError. */
  async publishData(repo: ContentRepository, raw: unknown, notes: string | null, userId: string | null): Promise<number> {
    const r = inspectContent(raw);
    if (!r.content || !r.data) throw new ContentInvalidError(r.issues);
    const record = await repo.publish(r.data as unknown as ContentData, notes, userId);
    this.use(r.content, r.data, record.number);
    return record.number;
  }

  /** Swap in new content for matches that start from now on. */
  publish(content: Content): number {
    this.use(content, undefined, this.version + 1);
    return this.version;
  }

  private use(content: Content, data: ContentSetData | undefined, version: number): void {
    this.current = content;
    this.data = data;
    this.version = version;
    this.built.set(version, content);
  }
}
