import open from "open"
import path from "node:path"
import { fileURLToPath } from "node:url"

export function openUrl(input: string) {
  const url = URL.canParse(input) ? new URL(input) : undefined
  if (!url || (url.protocol !== "http:" && url.protocol !== "https:"))
    return Promise.reject(new Error(`Only http and https links can be opened in the browser: ${input}`))
  return open(url.href)
}

export function openPath(path: string) {
  return open(path)
}

/** Open an http(s) URL in the browser, or a local file path / local file:// link with the OS handler. */
export function openHref(input: string, base?: string) {
  const target = resolveOpenTarget(input, base)
  if (!target)
    return Promise.reject(new Error(`Only http, https, and local file links can be opened: ${input}`))
  return open(target)
}

/** Maps a clicked href to what the OS can actually open, or undefined when nothing would succeed. */
export function resolveOpenTarget(input: string, base?: string) {
  if (input.startsWith("#")) return undefined
  // Absolute paths before URL parsing: URL.canParse treats `C:\…` / `C:/…` as scheme "c:".
  if (path.isAbsolute(input) || /^[A-Za-z]:[\\/]/.test(input)) return decodeLocalHref(input)
  const url = URL.canParse(input) ? new URL(input) : undefined
  if (url) {
    if (url.protocol === "http:" || url.protocol === "https:") return url.href
    // Only local file URLs (no host) become filesystem paths.
    if (url.protocol === "file:" && !url.hostname) {
      try {
        return fileURLToPath(url.href)
      } catch {
        return undefined
      }
    }
    return undefined
  }
  // Markdown hrefs keep URI spelling; resolve project-relative links against the session directory.
  if (base === undefined) return undefined
  return path.resolve(base, decodeLocalHref(input))
}

/** Decodes percent-escapes in a file path and drops a trailing `#fragment` / `?query`. */
function decodeLocalHref(input: string) {
  const end = Math.min(
    ...[input.indexOf("#"), input.indexOf("?")].filter((index) => index !== -1),
    input.length,
  )
  const pathPart = input.slice(0, end)
  try {
    return decodeURIComponent(pathPart)
  } catch {
    return pathPart
  }
}
