/**
 * Finds the tasks in a prompt's answer: numbered items, bullets and checkbox items.
 * Plain paragraphs are not tasks. Pure, so it can be tested without a browser.
 */
const ITEM = /^\s*(?:[-*•]|\d{1,3}[.)])\s+(?:\[[ xX]\]\s*)?(.+?)\s*$/;

export function parseTasks(output: string, max = 50): string[] {
  const seen = new Set<string>();
  const tasks: string[] = [];
  for (const line of output.split(/\r?\n/)) {
    const m = ITEM.exec(line);
    if (!m) continue;
    const title = m[1]
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/__(.+?)__/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .trim()
      .slice(0, 300);
    if (title.length < 2) continue;
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tasks.push(title);
    if (tasks.length >= max) break;
  }
  return tasks;
}

/** A single task from an answer that has no list: its first line as the title, the whole answer as the description. */
export function singleTask(output: string): { title: string; description: string } {
  const first = output.split(/\r?\n/).map((l) => l.trim()).find(Boolean) ?? 'Follow up';
  return { title: first.replace(/^#+\s*/, '').slice(0, 120), description: output.trim().slice(0, 4000) };
}
